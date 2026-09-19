import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { and, eq, gt } from "drizzle-orm";
import { db } from "@/db";
import { profiles, userSessions, users } from "@/db/schema";

const SESSION_COOKIE_NAME = "meydoquest_session";
const SESSION_TTL_DAYS = 30;

export type CurrentUser = {
  id: string;
  username: string;
  displayName: string;
  platformRole: "user" | "super_admin";
  profile: {
    preferredLanguage: string;
    avatarHue: number;
    avatarData: string | null;
    dailyGoalMinutes: number;
    streakCount: number;
    longestStreak: number;
    xpTotal: number;
    coinsTotal: number;
  } | null;
};

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function getExpiryDate() {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + SESSION_TTL_DAYS);
  return expiresAt;
}

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("hex");
  const tokenHash = hashToken(token);
  const expiresAt = getExpiryDate();

  await db.insert(userSessions).values({
    userId,
    tokenHash,
    expiresAt,
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export async function clearSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (token) {
    await db.delete(userSessions).where(eq(userSessions.tokenHash, hashToken(token)));
  }

  cookieStore.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(0),
  });
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  const sessionRows = await db
    .select({
      userId: users.id,
      username: users.username,
      displayName: users.displayName,
      platformRole: users.platformRole,
      preferredLanguage: profiles.preferredLanguage,
      avatarHue: profiles.avatarHue,
      avatarData: profiles.avatarData,
      dailyGoalMinutes: profiles.dailyGoalMinutes,
      streakCount: profiles.streakCount,
      longestStreak: profiles.longestStreak,
      xpTotal: profiles.xpTotal,
      coinsTotal: profiles.coinsTotal,
    })
    .from(userSessions)
    .innerJoin(users, eq(userSessions.userId, users.id))
    .leftJoin(profiles, eq(profiles.userId, users.id))
    .where(and(eq(userSessions.tokenHash, hashToken(token)), gt(userSessions.expiresAt, new Date())))
    .limit(1);

  const row = sessionRows[0];

  if (!row) {
    return null;
  }

  await db
    .update(userSessions)
    .set({ lastSeenAt: new Date() })
    .where(eq(userSessions.tokenHash, hashToken(token)));

  return {
    id: row.userId,
    username: row.username,
    displayName: row.displayName,
    platformRole: row.platformRole,
    profile: row.preferredLanguage
      ? {
          preferredLanguage: row.preferredLanguage,
          avatarHue: row.avatarHue ?? 140,
          avatarData: row.avatarData ?? null,
          dailyGoalMinutes: row.dailyGoalMinutes ?? 15,
          streakCount: row.streakCount ?? 0,
          longestStreak: row.longestStreak ?? 0,
          xpTotal: row.xpTotal ?? 0,
          coinsTotal: row.coinsTotal ?? 0,
        }
      : null,
  };
}
