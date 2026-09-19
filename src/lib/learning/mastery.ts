import type { masteryLevelEnum } from "@/db/schema";

export type MasteryLevel = (typeof masteryLevelEnum.enumValues)[number];

export type MasteryEvidence = {
  accuracy: number;
  averageConfidence: number;
  averageStabilityDays: number;
  evidenceCount: number;
};

export type MasteryResult = {
  score: number;
  level: MasteryLevel;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function deriveMastery(evidence: MasteryEvidence): MasteryResult {
  const accuracyScore = clamp(evidence.accuracy, 0, 1) * 55;
  const confidenceScore = clamp((evidence.averageConfidence - 1) / 3, 0, 1) * 10;
  const stabilityScore = clamp(evidence.averageStabilityDays / 14, 0, 1) * 20;
  const evidenceScore = clamp(evidence.evidenceCount / 12, 0, 1) * 15;

  const score = Number((accuracyScore + confidenceScore + stabilityScore + evidenceScore).toFixed(2));

  if (score >= 90) {
    return { score, level: "mastered" };
  }
  if (score >= 75) {
    return { score, level: "proficient" };
  }
  if (score >= 55) {
    return { score, level: "familiar" };
  }
  if (score >= 35) {
    return { score, level: "learning" };
  }
  if (score >= 15) {
    return { score, level: "introduced" };
  }

  return { score, level: "not_started" };
}
