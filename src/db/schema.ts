import {
  boolean,
  date,
  doublePrecision,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const platformRoleEnum = pgEnum("platform_role", ["user", "super_admin"]);
export const membershipRoleEnum = pgEnum("membership_role", [
  "owner",
  "admin",
  "teacher",
  "assistant_teacher",
  "student",
  "moderator",
  "member",
]);
export const groupKindEnum = pgEnum("group_kind", ["classroom", "course", "study_group", "community"]);
export const visibilityEnum = pgEnum("visibility", ["private", "group", "organization", "public"]);
export const publicationStatusEnum = pgEnum("publication_status", ["draft", "published", "archived"]);
export const learningItemTypeEnum = pgEnum("learning_item_type", [
  "term",
  "concept",
  "definition",
  "sentence",
  "formula",
  "problem",
  "process",
  "code",
  "fact",
  "diagram",
]);
export const exerciseTypeEnum = pgEnum("exercise_type", [
  "flashcard",
  "text_input",
  "single_choice",
  "multiple_select",
  "true_false",
  "numeric",
  "cloze",
]);
export const validatorTypeEnum = pgEnum("validator_type", [
  "exact",
  "normalized_text",
  "multiple_valid_answers",
  "single_choice",
  "multiple_select",
  "true_false",
  "numeric",
]);
export const assignmentStatusEnum = pgEnum("assignment_status", ["draft", "published", "archived"]);
export const sessionModeEnum = pgEnum("session_mode", ["practice", "review", "assignment"]);
export const sessionStatusEnum = pgEnum("session_status", ["active", "completed", "abandoned"]);
export const masteryLevelEnum = pgEnum("mastery_level", [
  "not_started",
  "introduced",
  "learning",
  "familiar",
  "proficient",
  "mastered",
]);
export const ledgerTypeEnum = pgEnum("ledger_type", ["xp", "coin"]);
export const achievementConditionEnum = pgEnum("achievement_condition", [
  "attempts_total",
  "xp_total",
  "groups_joined",
  "streak_days",
  "sessions_completed",
]);
export const supportTicketStatusEnum = pgEnum("support_ticket_status", ["open", "in_progress", "resolved", "closed"]);
export const supportTicketPriorityEnum = pgEnum("support_ticket_priority", ["low", "normal", "high", "urgent"]);

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    username: varchar("username", { length: 120 }).notNull(),
    email: varchar("email", { length: 320 }),
    passwordHash: text("password_hash").notNull(),
    displayName: varchar("display_name", { length: 120 }).notNull(),
    platformRole: platformRoleEnum("platform_role").notNull().default("user"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("users_username_key").on(table.username)],
);

export const profiles = pgTable("profiles", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  bio: text("bio"),
  preferredLanguage: varchar("preferred_language", { length: 12 }).notNull().default("de"),
  avatarHue: integer("avatar_hue").notNull().default(140),
  avatarData: text("avatar_data"),
  dailyGoalMinutes: integer("daily_goal_minutes").notNull().default(15),
  streakCount: integer("streak_count").notNull().default(0),
  longestStreak: integer("longest_streak").notNull().default(0),
  lastActiveOn: date("last_active_on"),
  xpTotal: integer("xp_total").notNull().default(0),
  coinsTotal: integer("coins_total").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const userSessions = pgTable(
  "user_sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("user_sessions_token_hash_key").on(table.tokenHash), index("user_sessions_user_idx").on(table.userId)],
);

export const organizations = pgTable(
  "organizations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name", { length: 160 }).notNull(),
    slug: varchar("slug", { length: 180 }).notNull(),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    branding: jsonb("branding").notNull().default(sql`'{}'::jsonb`),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("organizations_slug_key").on(table.slug)],
);

export const organizationMemberships = pgTable(
  "organization_memberships",
  {
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: membershipRoleEnum("role").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.organizationId, table.userId], name: "organization_memberships_pk" }),
    index("organization_memberships_user_idx").on(table.userId),
  ],
);

export const subjects = pgTable(
  "subjects",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    slug: varchar("slug", { length: 140 }).notNull(),
    name: varchar("name", { length: 140 }).notNull(),
    description: text("description"),
    icon: varchar("icon", { length: 64 }),
    languageCode: varchar("language_code", { length: 12 }),
    isSystem: boolean("is_system").notNull().default(false),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("subjects_slug_key").on(table.slug)],
);

export const skills = pgTable(
  "skills",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    subjectId: uuid("subject_id").references(() => subjects.id, { onDelete: "set null" }),
    parentSkillId: uuid("parent_skill_id").references((): AnyPgColumn => skills.id, { onDelete: "set null" }),
    name: varchar("name", { length: 160 }).notNull(),
    description: text("description"),
    difficulty: integer("difficulty").notNull().default(1),
    learningObjectives: text("learning_objectives").array().notNull().default(sql`ARRAY[]::text[]`),
    metadata: jsonb("metadata").notNull().default(sql`'{}'::jsonb`),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("skills_subject_idx").on(table.subjectId), index("skills_parent_idx").on(table.parentSkillId)],
);

export const skillPrerequisites = pgTable(
  "skill_prerequisites",
  {
    skillId: uuid("skill_id")
      .notNull()
      .references(() => skills.id, { onDelete: "cascade" }),
    prerequisiteSkillId: uuid("prerequisite_skill_id")
      .notNull()
      .references(() => skills.id, { onDelete: "cascade" }),
  },
  (table) => [primaryKey({ columns: [table.skillId, table.prerequisiteSkillId], name: "skill_prerequisites_pk" })],
);

export const groups = pgTable(
  "groups",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id").references(() => organizations.id, { onDelete: "set null" }),
    subjectId: uuid("subject_id").references(() => subjects.id, { onDelete: "set null" }),
    kind: groupKindEnum("kind").notNull().default("classroom"),
    name: varchar("name", { length: 160 }).notNull(),
    slug: varchar("slug", { length: 180 }).notNull(),
    description: text("description"),
    isPublic: boolean("is_public").notNull().default(false),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("groups_slug_key").on(table.slug), index("groups_org_idx").on(table.organizationId)],
);

export const groupMemberships = pgTable(
  "group_memberships",
  {
    groupId: uuid("group_id")
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: membershipRoleEnum("role").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.groupId, table.userId], name: "group_memberships_pk" }),
    index("group_memberships_user_idx").on(table.userId),
  ],
);

export const groupInvites = pgTable(
  "group_invites",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    groupId: uuid("group_id")
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
    code: varchar("code", { length: 24 }).notNull(),
    role: membershipRoleEnum("role").notNull().default("student"),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    maxUses: integer("max_uses").notNull().default(100),
    usedCount: integer("used_count").notNull().default(0),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("group_invites_code_key").on(table.code), index("group_invites_group_idx").on(table.groupId)],
);

export const contentCollections = pgTable(
  "content_collections",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ownerUserId: uuid("owner_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    organizationId: uuid("organization_id").references(() => organizations.id, { onDelete: "set null" }),
    groupId: uuid("group_id").references(() => groups.id, { onDelete: "set null" }),
    subjectId: uuid("subject_id").references(() => subjects.id, { onDelete: "set null" }),
    title: varchar("title", { length: 180 }).notNull(),
    description: text("description"),
    visibility: visibilityEnum("visibility").notNull().default("private"),
    status: publicationStatusEnum("status").notNull().default("draft"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("content_collections_owner_idx").on(table.ownerUserId), index("content_collections_group_idx").on(table.groupId)],
);

export const learningItems = pgTable(
  "learning_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    collectionId: uuid("collection_id")
      .notNull()
      .references(() => contentCollections.id, { onDelete: "cascade" }),
    subjectId: uuid("subject_id").references(() => subjects.id, { onDelete: "set null" }),
    primarySkillId: uuid("primary_skill_id").references(() => skills.id, { onDelete: "set null" }),
    type: learningItemTypeEnum("type").notNull().default("concept"),
    title: varchar("title", { length: 220 }).notNull(),
    prompt: text("prompt").notNull(),
    canonicalAnswer: text("canonical_answer"),
    explanation: text("explanation"),
    languageFrom: varchar("language_from", { length: 12 }),
    languageTo: varchar("language_to", { length: 12 }),
    itemData: jsonb("item_data").notNull().default(sql`'{}'::jsonb`),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("learning_items_collection_idx").on(table.collectionId), index("learning_items_skill_idx").on(table.primarySkillId)],
);

export const learningItemSkills = pgTable(
  "learning_item_skills",
  {
    learningItemId: uuid("learning_item_id")
      .notNull()
      .references(() => learningItems.id, { onDelete: "cascade" }),
    skillId: uuid("skill_id")
      .notNull()
      .references(() => skills.id, { onDelete: "cascade" }),
  },
  (table) => [primaryKey({ columns: [table.learningItemId, table.skillId], name: "learning_item_skills_pk" })],
);

export const exercises = pgTable(
  "exercises",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    collectionId: uuid("collection_id")
      .notNull()
      .references(() => contentCollections.id, { onDelete: "cascade" }),
    learningItemId: uuid("learning_item_id").references(() => learningItems.id, { onDelete: "set null" }),
    subjectId: uuid("subject_id").references(() => subjects.id, { onDelete: "set null" }),
    skillId: uuid("skill_id").references(() => skills.id, { onDelete: "set null" }),
    type: exerciseTypeEnum("type").notNull(),
    title: varchar("title", { length: 220 }).notNull(),
    prompt: text("prompt").notNull(),
    content: jsonb("content").notNull().default(sql`'{}'::jsonb`),
    validatorType: validatorTypeEnum("validator_type").notNull(),
    validatorConfig: jsonb("validator_config").notNull().default(sql`'{}'::jsonb`),
    explanation: text("explanation"),
    difficulty: integer("difficulty").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("exercises_collection_idx").on(table.collectionId), index("exercises_learning_item_idx").on(table.learningItemId)],
);

export const assignments = pgTable(
  "assignments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    groupId: uuid("group_id")
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
    collectionId: uuid("collection_id")
      .notNull()
      .references(() => contentCollections.id, { onDelete: "cascade" }),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    title: varchar("title", { length: 180 }).notNull(),
    instructions: text("instructions"),
    startAt: timestamp("start_at", { withTimezone: true }),
    dueAt: timestamp("due_at", { withTimezone: true }),
    timeLimitMinutes: integer("time_limit_minutes"),
    attemptsAllowed: integer("attempts_allowed").notNull().default(1),
    settings: jsonb("settings").notNull().default(sql`'{}'::jsonb`),
    status: assignmentStatusEnum("status").notNull().default("draft"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("assignments_group_idx").on(table.groupId), index("assignments_collection_idx").on(table.collectionId)],
);

export const learningSessions = pgTable(
  "learning_sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    assignmentId: uuid("assignment_id").references(() => assignments.id, { onDelete: "set null" }),
    collectionId: uuid("collection_id").references(() => contentCollections.id, { onDelete: "set null" }),
    groupId: uuid("group_id").references(() => groups.id, { onDelete: "set null" }),
    mode: sessionModeEnum("mode").notNull(),
    status: sessionStatusEnum("status").notNull().default("active"),
    currentIndex: integer("current_index").notNull().default(0),
    correctCount: integer("correct_count").notNull().default(0),
    totalXpEarned: integer("total_xp_earned").notNull().default(0),
    totalCoinsEarned: integer("total_coins_earned").notNull().default(0),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (table) => [index("learning_sessions_user_idx").on(table.userId), index("learning_sessions_assignment_idx").on(table.assignmentId)],
);

export const attempts = pgTable(
  "attempts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => learningSessions.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    exerciseId: uuid("exercise_id")
      .notNull()
      .references(() => exercises.id, { onDelete: "cascade" }),
    learningItemId: uuid("learning_item_id").references(() => learningItems.id, { onDelete: "set null" }),
    assignmentId: uuid("assignment_id").references(() => assignments.id, { onDelete: "set null" }),
    ordinal: integer("ordinal").notNull(),
    response: jsonb("response").notNull().default(sql`'{}'::jsonb`),
    isCorrect: boolean("is_correct").notNull(),
    scoreNumeric: numeric("score_numeric", { precision: 5, scale: 2 }).notNull().default("0"),
    confidence: integer("confidence").notNull().default(2),
    responseTimeMs: integer("response_time_ms").notNull().default(0),
    feedback: text("feedback"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("attempts_session_idx").on(table.sessionId), index("attempts_user_exercise_idx").on(table.userId, table.exerciseId)],
);

export const reviewStates = pgTable(
  "review_states",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    learningItemId: uuid("learning_item_id")
      .notNull()
      .references(() => learningItems.id, { onDelete: "cascade" }),
    difficulty: doublePrecision("difficulty").notNull().default(5),
    stabilityDays: doublePrecision("stability_days").notNull().default(1),
    targetRetention: doublePrecision("target_retention").notNull().default(0.9),
    dueAt: timestamp("due_at", { withTimezone: true }).notNull().defaultNow(),
    lastReviewedAt: timestamp("last_reviewed_at", { withTimezone: true }),
    reps: integer("reps").notNull().default(0),
    lapses: integer("lapses").notNull().default(0),
    lastResult: boolean("last_result").notNull().default(false),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.learningItemId], name: "review_states_pk" }),
    index("review_states_due_idx").on(table.userId, table.dueAt),
  ],
);

export const masterySnapshots = pgTable(
  "mastery_snapshots",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    skillId: uuid("skill_id")
      .notNull()
      .references(() => skills.id, { onDelete: "cascade" }),
    score: doublePrecision("score").notNull().default(0),
    level: masteryLevelEnum("level").notNull().default("not_started"),
    evidenceCount: integer("evidence_count").notNull().default(0),
    lastEvaluatedAt: timestamp("last_evaluated_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.skillId], name: "mastery_snapshots_pk" }),
    index("mastery_snapshots_user_idx").on(table.userId),
  ],
);

export const learningEvents = pgTable(
  "learning_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
    organizationId: uuid("organization_id").references(() => organizations.id, { onDelete: "set null" }),
    groupId: uuid("group_id").references(() => groups.id, { onDelete: "set null" }),
    sessionId: uuid("session_id").references(() => learningSessions.id, { onDelete: "set null" }),
    assignmentId: uuid("assignment_id").references(() => assignments.id, { onDelete: "set null" }),
    learningItemId: uuid("learning_item_id").references(() => learningItems.id, { onDelete: "set null" }),
    exerciseId: uuid("exercise_id").references(() => exercises.id, { onDelete: "set null" }),
    skillId: uuid("skill_id").references(() => skills.id, { onDelete: "set null" }),
    eventType: varchar("event_type", { length: 80 }).notNull(),
    payload: jsonb("payload").notNull().default(sql`'{}'::jsonb`),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("learning_events_user_idx").on(table.userId), index("learning_events_type_idx").on(table.eventType)],
);

export const ledgerEntries = pgTable(
  "ledger_entries",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    ledgerType: ledgerTypeEnum("ledger_type").notNull(),
    amount: integer("amount").notNull(),
    reason: varchar("reason", { length: 120 }).notNull(),
    sourceType: varchar("source_type", { length: 80 }).notNull(),
    sourceId: uuid("source_id"),
    metadata: jsonb("metadata").notNull().default(sql`'{}'::jsonb`),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("ledger_entries_user_idx").on(table.userId, table.ledgerType)],
);

export const achievements = pgTable(
  "achievements",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    slug: varchar("slug", { length: 120 }).notNull(),
    name: varchar("name", { length: 140 }).notNull(),
    description: text("description").notNull(),
    icon: varchar("icon", { length: 24 }).notNull().default("🏆"),
    conditionType: achievementConditionEnum("condition_type").notNull(),
    threshold: integer("threshold").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("achievements_slug_key").on(table.slug)],
);

export const userAchievements = pgTable(
  "user_achievements",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    achievementId: uuid("achievement_id")
      .notNull()
      .references(() => achievements.id, { onDelete: "cascade" }),
    unlockedAt: timestamp("unlocked_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("user_achievements_user_achievement_key").on(table.userId, table.achievementId)],
);

export const platformSettings = pgTable("platform_settings", {
  key: varchar("key", { length: 80 }).primaryKey(),
  siteName: varchar("site_name", { length: 160 }).notNull().default("meydoQuest"),
  slogan: text("slogan").notNull().default("Vokabeln lernen. Sofort loslegen."),
  logoData: text("logo_data"),
  sadLogoData: text("sad_logo_data"),
  supportEmail: varchar("support_email", { length: 320 }),
  supportInfo: text("support_info"),
  allowRegistrations: boolean("allow_registrations").notNull().default(true),
  maintenanceMode: boolean("maintenance_mode").notNull().default(false),
  updatedBy: uuid("updated_by").references(() => users.id, { onDelete: "set null" }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const supportTickets = pgTable(
  "support_tickets",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    subject: varchar("subject", { length: 180 }).notNull(),
    message: text("message").notNull(),
    status: supportTicketStatusEnum("status").notNull().default("open"),
    priority: supportTicketPriorityEnum("priority").notNull().default("normal"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("support_tickets_user_idx").on(table.userId), index("support_tickets_status_idx").on(table.status)],
);

export const supportTicketMessages = pgTable(
  "support_ticket_messages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ticketId: uuid("ticket_id")
      .notNull()
      .references(() => supportTickets.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    isAdmin: boolean("is_admin").notNull().default(false),
    message: text("message").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("support_ticket_messages_ticket_idx").on(table.ticketId, table.createdAt)],
);

export const groupAnnouncements = pgTable(
  "group_announcements",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    groupId: uuid("group_id")
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 180 }).notNull(),
    message: text("message").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("group_announcements_group_idx").on(table.groupId, table.createdAt)],
);
