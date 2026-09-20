import { and, asc, desc, eq, inArray, lte, or, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  achievements,
  assignments,
  contentCollections,
  groupAnnouncements,
  groupInvites,
  groupMemberships,
  groups,
  learningSessions,
  masterySnapshots,
  profiles,
  reviewStates,
  skills,
  subjects,
  userAchievements,
  users,
} from "@/db/schema";

function toNumber(value: unknown) {
  return Number(value ?? 0);
}

export async function getPlatformSummary() {
  const result = await db.execute(sql`
    select
      (select count(*) from users) as users_count,
      (select count(*) from groups) as groups_count,
      (select count(*) from content_collections) as collections_count,
      (select count(*) from attempts) as attempts_count
  `);

  const row = result.rows[0];

  return {
    users: toNumber(row?.users_count),
    groups: toNumber(row?.groups_count),
    collections: toNumber(row?.collections_count),
    attempts: toNumber(row?.attempts_count),
  };
}

export async function getDashboardData(userId: string) {
  const [userRow] = await db
    .select({
      id: users.id,
      username: users.username,
      displayName: users.displayName,
      preferredLanguage: profiles.preferredLanguage,
      avatarHue: profiles.avatarHue,
      avatarData: profiles.avatarData,
      profilePicData: profiles.profilePicData,
      dailyGoalMinutes: profiles.dailyGoalMinutes,
      streakCount: profiles.streakCount,
      longestStreak: profiles.longestStreak,
      lastActiveOn: profiles.lastActiveOn,
      xpTotal: profiles.xpTotal,
      coinsTotal: profiles.coinsTotal,
    })
    .from(users)
    .leftJoin(profiles, eq(profiles.userId, users.id))
    .where(eq(users.id, userId))
    .limit(1);

  const memberships = await db
    .select({
      groupId: groups.id,
      groupName: groups.name,
      groupSlug: groups.slug,
      groupKind: groups.kind,
      membershipRole: groupMemberships.role,
      subjectName: subjects.name,
    })
    .from(groupMemberships)
    .innerJoin(groups, eq(groupMemberships.groupId, groups.id))
    .leftJoin(subjects, eq(groups.subjectId, subjects.id))
    .where(eq(groupMemberships.userId, userId))
    .orderBy(asc(groups.name));

  const groupIds = memberships.map((membership) => membership.groupId);

  const dueReviews = await db
    .select({ count: sql<number>`count(*)` })
    .from(reviewStates)
    .where(and(eq(reviewStates.userId, userId), lte(reviewStates.dueAt, new Date())));

  const accessibleCollections = groupIds.length
    ? await db
        .select({
          id: contentCollections.id,
          groupId: contentCollections.groupId,
          title: contentCollections.title,
          description: contentCollections.description,
          visibility: contentCollections.visibility,
          status: contentCollections.status,
          subjectName: subjects.name,
        })
        .from(contentCollections)
        .leftJoin(subjects, eq(contentCollections.subjectId, subjects.id))
        .where(
          or(
            eq(contentCollections.ownerUserId, userId),
            eq(contentCollections.visibility, "public"),
            inArray(contentCollections.groupId, groupIds),
          ),
        )
        .orderBy(desc(contentCollections.createdAt))
        .limit(8)
    : await db
        .select({
          id: contentCollections.id,
          groupId: contentCollections.groupId,
          title: contentCollections.title,
          description: contentCollections.description,
          visibility: contentCollections.visibility,
          status: contentCollections.status,
          subjectName: subjects.name,
        })
        .from(contentCollections)
        .leftJoin(subjects, eq(contentCollections.subjectId, subjects.id))
        .where(or(eq(contentCollections.ownerUserId, userId), eq(contentCollections.visibility, "public")))
        .orderBy(desc(contentCollections.createdAt))
        .limit(8);

  const upcomingAssignments = groupIds.length
    ? await db
        .select({
          id: assignments.id,
          title: assignments.title,
          status: assignments.status,
          dueAt: assignments.dueAt,
          startAt: assignments.startAt,
          groupName: groups.name,
          collectionTitle: contentCollections.title,
        })
        .from(assignments)
        .innerJoin(groups, eq(assignments.groupId, groups.id))
        .innerJoin(contentCollections, eq(assignments.collectionId, contentCollections.id))
        .where(and(inArray(assignments.groupId, groupIds), eq(assignments.status, "published")))
        .orderBy(asc(assignments.dueAt), desc(assignments.createdAt))
        .limit(8)
    : [];

  const recentSessions = await db
    .select({
      id: learningSessions.id,
      mode: learningSessions.mode,
      status: learningSessions.status,
      correctCount: learningSessions.correctCount,
      totalXpEarned: learningSessions.totalXpEarned,
      startedAt: learningSessions.startedAt,
      completedAt: learningSessions.completedAt,
    })
    .from(learningSessions)
    .where(eq(learningSessions.userId, userId))
    .orderBy(desc(learningSessions.startedAt))
    .limit(6);

  const activeInvites = groupIds.length
    ? await db
        .select({
          groupId: groupInvites.groupId,
          code: groupInvites.code,
          role: groupInvites.role,
          usedCount: groupInvites.usedCount,
          maxUses: groupInvites.maxUses,
          expiresAt: groupInvites.expiresAt,
        })
        .from(groupInvites)
        .where(inArray(groupInvites.groupId, groupIds))
        .orderBy(desc(groupInvites.createdAt))
    : [];

  const recentAnnouncements = groupIds.length
    ? await db
        .select({
          id: groupAnnouncements.id,
          groupId: groupAnnouncements.groupId,
          title: groupAnnouncements.title,
          message: groupAnnouncements.message,
          createdAt: groupAnnouncements.createdAt,
          groupName: groups.name,
        })
        .from(groupAnnouncements)
        .innerJoin(groups, eq(groupAnnouncements.groupId, groups.id))
        .where(inArray(groupAnnouncements.groupId, groupIds))
        .orderBy(desc(groupAnnouncements.createdAt))
        .limit(8)
    : [];

  const weakestSkills = await db
    .select({
      skillId: masterySnapshots.skillId,
      score: masterySnapshots.score,
      level: masterySnapshots.level,
      evidenceCount: masterySnapshots.evidenceCount,
      skillName: skills.name,
    })
    .from(masterySnapshots)
    .innerJoin(skills, eq(masterySnapshots.skillId, skills.id))
    .where(eq(masterySnapshots.userId, userId))
    .orderBy(asc(masterySnapshots.score), desc(masterySnapshots.evidenceCount))
    .limit(5);

  const unlockedAchievements = await db
    .select({
      id: userAchievements.id,
      unlockedAt: userAchievements.unlockedAt,
      name: achievements.name,
      description: achievements.description,
      icon: achievements.icon,
    })
    .from(userAchievements)
    .innerJoin(achievements, eq(userAchievements.achievementId, achievements.id))
    .where(eq(userAchievements.userId, userId))
    .orderBy(desc(userAchievements.unlockedAt))
    .limit(6);

  return {
    user: userRow ?? null,
    memberships,
    accessibleCollections,
    upcomingAssignments,
    recentSessions,
    activeInvites,
    recentAnnouncements,
    weakestSkills,
    unlockedAchievements,
    dueReviewCount: toNumber(dueReviews[0]?.count),
  };
}
