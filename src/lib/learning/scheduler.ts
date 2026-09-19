export type ReviewStateInput = {
  difficulty: number;
  stabilityDays: number;
  targetRetention: number;
  reps: number;
  lapses: number;
  lastReviewedAt: Date | null;
};

export type ReviewOutcome = {
  correct: boolean;
  confidence: number;
  responseTimeMs: number;
  now?: Date;
};

export type ReviewScheduleResult = {
  difficulty: number;
  stabilityDays: number;
  targetRetention: number;
  reps: number;
  lapses: number;
  dueAt: Date;
  lastReviewedAt: Date;
  lastResult: boolean;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function addDays(base: Date, days: number) {
  const next = new Date(base);
  next.setTime(next.getTime() + days * 24 * 60 * 60 * 1000);
  return next;
}

function getElapsedDays(lastReviewedAt: Date | null, now: Date) {
  if (!lastReviewedAt) {
    return 1;
  }

  const diffMs = now.getTime() - lastReviewedAt.getTime();
  return Math.max(0.1, diffMs / (24 * 60 * 60 * 1000));
}

export function scheduleReview(state: ReviewStateInput | null, outcome: ReviewOutcome): ReviewScheduleResult {
  const now = outcome.now ?? new Date();
  const base = state ?? {
    difficulty: 5,
    stabilityDays: 1,
    targetRetention: 0.9,
    reps: 0,
    lapses: 0,
    lastReviewedAt: null,
  };

  const elapsedDays = getElapsedDays(base.lastReviewedAt, now);
  const normalizedConfidence = clamp(outcome.confidence || 2, 1, 4);
  const speedFactor = outcome.responseTimeMs <= 6000 ? 1.08 : outcome.responseTimeMs >= 20000 ? 0.9 : 1;

  if (outcome.correct) {
    const difficultyShift = (2.5 - normalizedConfidence) * 0.3 + (outcome.responseTimeMs > 16000 ? 0.15 : -0.05);
    const difficulty = clamp(base.difficulty + difficultyShift, 1, 10);
    const stabilityGrowth =
      1.45 +
      (10 - difficulty) * 0.07 +
      (normalizedConfidence - 2) * 0.12 +
      Math.min(elapsedDays / Math.max(base.stabilityDays, 1), 1.5) * 0.18;
    const stabilityDays = Math.max(1, Number((base.stabilityDays * stabilityGrowth * speedFactor).toFixed(2)));
    const intervalDays = Math.max(1, Number((stabilityDays * base.targetRetention).toFixed(2)));

    return {
      difficulty,
      stabilityDays,
      targetRetention: base.targetRetention,
      reps: base.reps + 1,
      lapses: base.lapses,
      dueAt: addDays(now, intervalDays),
      lastReviewedAt: now,
      lastResult: true,
    };
  }

  const difficulty = clamp(base.difficulty + 0.9 + (2.5 - normalizedConfidence) * 0.15, 1, 10);
  const stabilityDays = Math.max(0.25, Number((base.stabilityDays * 0.45).toFixed(2)));
  const relearnIntervalDays = Math.max(0.15, Number((0.35 + stabilityDays * 0.4).toFixed(2)));

  return {
    difficulty,
    stabilityDays,
    targetRetention: base.targetRetention,
    reps: base.reps + 1,
    lapses: base.lapses + 1,
    dueAt: addDays(now, relearnIntervalDays),
    lastReviewedAt: now,
    lastResult: false,
  };
}
