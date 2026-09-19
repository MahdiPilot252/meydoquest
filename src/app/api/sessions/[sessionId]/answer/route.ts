import { and, count, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { achievements, attempts, exercises, groupMemberships, ledgerEntries, learningEvents, learningItems, learningSessions, masterySnapshots, profiles, reviewStates, userAchievements } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth/session";
import { redirectAntwort } from "@/lib/http";
import { deriveMastery } from "@/lib/learning/mastery";
import { DEFAULT_ACHIEVEMENTS, getAttemptRewardBundle } from "@/lib/learning/rewards";
import { scheduleReview } from "@/lib/learning/scheduler";
import { validateExerciseAnswer } from "@/lib/learning/validators";

function toDateKey(d: Date) { return d.toISOString().slice(0, 10); }

function getStreakUpdate(lastActiveOn: string | null, streakCount: number, longestStreak: number) {
  const now = new Date();
  const today = toDateKey(now);
  const yesterday = new Date(now);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  if (lastActiveOn === today) return { streakCount, longestStreak, lastActiveOn: today };
  const next = lastActiveOn === toDateKey(yesterday) ? streakCount + 1 : 1;
  return { streakCount: next, longestStreak: Math.max(longestStreak, next), lastActiveOn: today };
}

export async function POST(request: Request, context: { params: Promise<{ sessionId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return redirectAntwort(request, "/anmelden");

  const { sessionId } = await context.params;

  const sessionRows = await db.select({
    id: learningSessions.id, userId: learningSessions.userId,
    assignmentId: learningSessions.assignmentId, collectionId: learningSessions.collectionId,
    groupId: learningSessions.groupId, mode: learningSessions.mode, status: learningSessions.status,
    currentIndex: learningSessions.currentIndex, correctCount: learningSessions.correctCount,
    totalXpEarned: learningSessions.totalXpEarned, totalCoinsEarned: learningSessions.totalCoinsEarned,
  }).from(learningSessions).where(and(eq(learningSessions.id, sessionId), eq(learningSessions.userId, user.id))).limit(1);

  const session = sessionRows[0];
  if (!session || session.status !== "active" || !session.collectionId) {
    return redirectAntwort(request, "/?error=session_unavailable");
  }

  const exerciseRows = await db.select({
    id: exercises.id, learningItemId: exercises.learningItemId, skillId: exercises.skillId,
    type: exercises.type, title: exercises.title, prompt: exercises.prompt,
    content: exercises.content, validatorType: exercises.validatorType,
    validatorConfig: exercises.validatorConfig, explanation: exercises.explanation,
  }).from(exercises).where(eq(exercises.collectionId, session.collectionId)).orderBy(exercises.createdAt, exercises.title);

  const currentExercise = exerciseRows[session.currentIndex];
  if (!currentExercise) {
    await db.update(learningSessions).set({ status: "completed", completedAt: new Date() }).where(eq(learningSessions.id, session.id));
    return redirectAntwort(request, `/lernen/${session.id}?completed=1`);
  }

  const formData = await request.formData();
  const textAnswer = String(formData.get("textAnswer") ?? "").trim();
  const selectedOptionId = String(formData.get("selectedOptionId") ?? "").trim();
  const selectedOptionIds = formData.getAll("selectedOptionIds").map((v) => String(v).trim()).filter(Boolean);
  const booleanAnswer = String(formData.get("booleanAnswer") ?? "").trim();
  const numericAnswer = String(formData.get("numericAnswer") ?? "").trim();
  const confidence = Math.max(1, Math.min(4, Number(formData.get("confidence") ?? 2) || 2));
  const responseTimeMs = Math.max(0, Number(formData.get("responseTimeMs") ?? 0) || 0);

  const responsePayload = {
    text: textAnswer || undefined,
    selectedOptionId: selectedOptionId || undefined,
    selectedOptionIds: selectedOptionIds.length ? selectedOptionIds : undefined,
    booleanValue: booleanAnswer ? booleanAnswer === "true" : undefined,
    numericValue: numericAnswer ? Number(numericAnswer) : undefined,
  };

  const validation = validateExerciseAnswer(
    currentExercise.validatorType,
    currentExercise.validatorConfig as Parameters<typeof validateExerciseAnswer>[1],
    responsePayload,
  );

  const rewardBundle = getAttemptRewardBundle(validation.isCorrect, confidence, responseTimeMs);
  const nextIndex = session.currentIndex + 1;
  const isComplete = nextIndex >= exerciseRows.length;

  await db.transaction(async (tx) => {
    await tx.insert(attempts).values({
      sessionId: session.id, userId: user.id, exerciseId: currentExercise.id,
      learningItemId: currentExercise.learningItemId, assignmentId: session.assignmentId,
      ordinal: session.currentIndex + 1, response: responsePayload,
      isCorrect: validation.isCorrect, scoreNumeric: String(validation.score),
      confidence, responseTimeMs, feedback: validation.feedback,
    });

    await tx.update(learningSessions).set({
      currentIndex: nextIndex,
      correctCount: session.correctCount + (validation.isCorrect ? 1 : 0),
      totalXpEarned: session.totalXpEarned + rewardBundle.xp,
      totalCoinsEarned: session.totalCoinsEarned + rewardBundle.coins,
      status: isComplete ? "completed" : "active",
      completedAt: isComplete ? new Date() : null,
    }).where(eq(learningSessions.id, session.id));

    const profileRows = await tx.select({
      streakCount: profiles.streakCount, longestStreak: profiles.longestStreak,
      lastActiveOn: profiles.lastActiveOn, xpTotal: profiles.xpTotal, coinsTotal: profiles.coinsTotal,
    }).from(profiles).where(eq(profiles.userId, user.id)).limit(1);

    const profile = profileRows[0];
    const streak = getStreakUpdate(profile?.lastActiveOn ?? null, profile?.streakCount ?? 0, profile?.longestStreak ?? 0);
    const nextXpTotal = (profile?.xpTotal ?? 0) + rewardBundle.xp;
    const nextCoinsTotal = (profile?.coinsTotal ?? 0) + rewardBundle.coins;

    await tx.update(profiles).set({
      streakCount: streak.streakCount, longestStreak: streak.longestStreak,
      lastActiveOn: streak.lastActiveOn, xpTotal: nextXpTotal, coinsTotal: nextCoinsTotal, updatedAt: new Date(),
    }).where(eq(profiles.userId, user.id));

    await tx.insert(ledgerEntries).values([
      { userId: user.id, ledgerType: "xp", amount: rewardBundle.xp, reason: validation.isCorrect ? "answer_correct" : "answer_attempted", sourceType: "learning_session", sourceId: session.id, metadata: { exerciseId: currentExercise.id } },
      { userId: user.id, ledgerType: "coin", amount: rewardBundle.coins, reason: validation.isCorrect ? "answer_correct" : "answer_attempted", sourceType: "learning_session", sourceId: session.id, metadata: { exerciseId: currentExercise.id } },
    ]);

    await tx.insert(learningEvents).values([
      { userId: user.id, groupId: session.groupId, sessionId: session.id, assignmentId: session.assignmentId, learningItemId: currentExercise.learningItemId, exerciseId: currentExercise.id, skillId: currentExercise.skillId, eventType: "answer_submitted", payload: { correct: validation.isCorrect, score: validation.score, confidence, responseTimeMs } },
      { userId: user.id, groupId: session.groupId, sessionId: session.id, assignmentId: session.assignmentId, learningItemId: currentExercise.learningItemId, exerciseId: currentExercise.id, skillId: currentExercise.skillId, eventType: validation.isCorrect ? "answer_correct" : "answer_wrong", payload: { feedback: validation.feedback } },
      { userId: user.id, groupId: session.groupId, sessionId: session.id, eventType: "xp_awarded", payload: { xp: rewardBundle.xp, coins: rewardBundle.coins } },
    ]);

    if (currentExercise.learningItemId) {
      const prevReview = await tx.select({ difficulty: reviewStates.difficulty, stabilityDays: reviewStates.stabilityDays, targetRetention: reviewStates.targetRetention, reps: reviewStates.reps, lapses: reviewStates.lapses, lastReviewedAt: reviewStates.lastReviewedAt })
        .from(reviewStates).where(and(eq(reviewStates.userId, user.id), eq(reviewStates.learningItemId, currentExercise.learningItemId))).limit(1);

      const nextReview = scheduleReview(prevReview[0] ?? null, { correct: validation.isCorrect, confidence, responseTimeMs });

      await tx.insert(reviewStates).values({ userId: user.id, learningItemId: currentExercise.learningItemId, difficulty: nextReview.difficulty, stabilityDays: nextReview.stabilityDays, targetRetention: nextReview.targetRetention, dueAt: nextReview.dueAt, lastReviewedAt: nextReview.lastReviewedAt, reps: nextReview.reps, lapses: nextReview.lapses, lastResult: nextReview.lastResult, updatedAt: new Date() })
        .onConflictDoUpdate({ target: [reviewStates.userId, reviewStates.learningItemId], set: { difficulty: nextReview.difficulty, stabilityDays: nextReview.stabilityDays, targetRetention: nextReview.targetRetention, dueAt: nextReview.dueAt, lastReviewedAt: nextReview.lastReviewedAt, reps: nextReview.reps, lapses: nextReview.lapses, lastResult: nextReview.lastResult, updatedAt: new Date() } });

      await tx.insert(learningEvents).values({ userId: user.id, groupId: session.groupId, sessionId: session.id, learningItemId: currentExercise.learningItemId, exerciseId: currentExercise.id, eventType: "review_scheduled", payload: { dueAt: nextReview.dueAt.toISOString(), stabilityDays: nextReview.stabilityDays } });
    }

    if (currentExercise.skillId) {
      const evRows = await tx.select({ accuracy: sql<number>`avg(case when ${attempts.isCorrect} then 1.0 else 0.0 end)`, averageConfidence: sql<number>`avg(${attempts.confidence})`, evidenceCount: count() })
        .from(attempts).innerJoin(exercises, eq(attempts.exerciseId, exercises.id))
        .where(and(eq(attempts.userId, user.id), eq(exercises.skillId, currentExercise.skillId)));

      const stRows = await tx.select({ averageStability: sql<number>`avg(${reviewStates.stabilityDays})` })
        .from(reviewStates).innerJoin(learningItems, eq(reviewStates.learningItemId, learningItems.id))
        .where(and(eq(reviewStates.userId, user.id), eq(learningItems.primarySkillId, currentExercise.skillId)));

      const mastery = deriveMastery({ accuracy: Number(evRows[0]?.accuracy ?? 0), averageConfidence: Number(evRows[0]?.averageConfidence ?? confidence), averageStabilityDays: Number(stRows[0]?.averageStability ?? 0), evidenceCount: Number(evRows[0]?.evidenceCount ?? 0) });

      await tx.insert(masterySnapshots).values({ userId: user.id, skillId: currentExercise.skillId, score: mastery.score, level: mastery.level, evidenceCount: Number(evRows[0]?.evidenceCount ?? 0), lastEvaluatedAt: new Date(), updatedAt: new Date() })
        .onConflictDoUpdate({ target: [masterySnapshots.userId, masterySnapshots.skillId], set: { score: mastery.score, level: mastery.level, evidenceCount: Number(evRows[0]?.evidenceCount ?? 0), lastEvaluatedAt: new Date(), updatedAt: new Date() } });

      await tx.insert(learningEvents).values({ userId: user.id, groupId: session.groupId, sessionId: session.id, skillId: currentExercise.skillId, eventType: "mastery_updated", payload: { score: mastery.score, level: mastery.level } });
    }

    const attemptsTotal = await tx.select({ value: count() }).from(attempts).where(eq(attempts.userId, user.id));
    const groupsTotal = await tx.select({ value: count() }).from(groupMemberships).where(eq(groupMemberships.userId, user.id));
    const sessionsTotal = await tx.select({ value: count() }).from(learningSessions).where(and(eq(learningSessions.userId, user.id), eq(learningSessions.status, "completed")));

    const progress = {
      attempts_total: Number(attemptsTotal[0]?.value ?? 0),
      xp_total: nextXpTotal,
      groups_joined: Number(groupsTotal[0]?.value ?? 0),
      streak_days: streak.streakCount,
      sessions_completed: Number(sessionsTotal[0]?.value ?? 0),
    } as const;

    const achRows = await tx.select({ id: achievements.id, slug: achievements.slug }).from(achievements).orderBy(desc(achievements.threshold));
    const achMap = new Map(achRows.map((r) => [r.slug, r.id]));

    for (const def of DEFAULT_ACHIEVEMENTS) {
      const val = progress[def.conditionType];
      const achId = achMap.get(def.slug);
      if (!achId || val < def.threshold) continue;
      const ins = await tx.insert(userAchievements).values({ userId: user.id, achievementId: achId }).onConflictDoNothing().returning({ id: userAchievements.id });
      if (ins[0]) {
        await tx.insert(learningEvents).values({ userId: user.id, groupId: session.groupId, sessionId: session.id, eventType: "achievement_unlocked", payload: { slug: def.slug, name: def.name } });
      }
    }

    if (isComplete) {
      await tx.insert(learningEvents).values({ userId: user.id, groupId: session.groupId, sessionId: session.id, assignmentId: session.assignmentId, eventType: session.assignmentId ? "assignment_completed" : "session_finished", payload: { correctCount: session.correctCount + (validation.isCorrect ? 1 : 0), total: exerciseRows.length } });
    }
  });

  return redirectAntwort(request, `/lernen/${session.id}${isComplete ? "?completed=1" : "?answered=1"}`);
}
