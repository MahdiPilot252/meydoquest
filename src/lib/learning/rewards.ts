export type RewardBundle = {
  xp: number;
  coins: number;
};

export type AchievementDefinition = {
  slug: string;
  name: string;
  description: string;
  icon: string;
  conditionType: "attempts_total" | "xp_total" | "groups_joined" | "streak_days" | "sessions_completed";
  threshold: number;
};

export const DEFAULT_ACHIEVEMENTS: AchievementDefinition[] = [
  {
    slug: "first-answer",
    name: "Erster Funke",
    description: "Gib deine erste Lernantwort ab.",
    icon: "✨",
    conditionType: "attempts_total",
    threshold: 1,
  },
  {
    slug: "study-run-10",
    name: "Quest-Läufer",
    description: "Erreiche 10 Antworten insgesamt.",
    icon: "🏃",
    conditionType: "attempts_total",
    threshold: 10,
  },
  {
    slug: "xp-100",
    name: "Hundert XP",
    description: "Sammle 100 XP.",
    icon: "💯",
    conditionType: "xp_total",
    threshold: 100,
  },
  {
    slug: "streak-3",
    name: "Lernfluss",
    description: "Halte eine 3-Tage-Streak.",
    icon: "🔥",
    conditionType: "streak_days",
    threshold: 3,
  },
  {
    slug: "social-learner",
    name: "Gruppenstarter",
    description: "Tritt deiner ersten Lerngruppe bei.",
    icon: "🤝",
    conditionType: "groups_joined",
    threshold: 1,
  },
];

export function getAttemptRewardBundle(correct: boolean, confidence: number, responseTimeMs: number): RewardBundle {
  const baseXp = correct ? 12 : 4;
  const confidenceBonus = correct ? Math.max(0, confidence - 2) * 2 : 0;
  const speedBonus = correct && responseTimeMs <= 7000 ? 2 : 0;

  return {
    xp: baseXp + confidenceBonus + speedBonus,
    coins: correct ? 2 : 1,
  };
}
