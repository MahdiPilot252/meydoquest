import { desc } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { learningEvents, users } from "@/db/schema";
import { requireApiAdmin } from "@/lib/auth/api";

export async function GET(request: Request) {
  const auth = await requireApiAdmin(request);
  if (!auth.user) return auth.response;

  const [allUsers, recentEvents] = await Promise.all([
    db.select({ id: users.id, username: users.username, displayName: users.displayName, platformRole: users.platformRole }).from(users).orderBy(desc(users.createdAt)).limit(100),
    db.select({ id: learningEvents.id, eventType: learningEvents.eventType, createdAt: learningEvents.createdAt }).from(learningEvents).orderBy(desc(learningEvents.createdAt)).limit(50),
  ]);

  return NextResponse.json({ users: allUsers, recentEvents });
}
