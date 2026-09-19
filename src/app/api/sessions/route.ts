import { and, count, eq, inArray, or } from "drizzle-orm";
import { db } from "@/db";
import { assignments, contentCollections, exercises, groupMemberships, learningEvents, learningSessions } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth/session";
import { redirectAntwort } from "@/lib/http";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return redirectAntwort(request, "/anmelden");

  const formData = await request.formData();
  const collectionId = String(formData.get("collectionId") ?? "");
  const assignmentId = String(formData.get("assignmentId") ?? "");

  let resolvedCollectionId = collectionId;
  let resolvedGroupId: string | null = null;
  const mode: "practice" | "assignment" = assignmentId ? "assignment" : "practice";

  if (assignmentId) {
    const assignmentRows = await db
      .select({ id: assignments.id, groupId: assignments.groupId, collectionId: assignments.collectionId, attemptsAllowed: assignments.attemptsAllowed })
      .from(assignments)
      .innerJoin(groupMemberships, eq(groupMemberships.groupId, assignments.groupId))
      .where(and(eq(assignments.id, assignmentId), eq(groupMemberships.userId, user.id)))
      .limit(1);

    const assignment = assignmentRows[0];
    if (!assignment) return redirectAntwort(request, "/?error=aufgabe_verboten");

    const sessionCount = await db.select({ value: count() }).from(learningSessions)
      .where(and(eq(learningSessions.assignmentId, assignmentId), eq(learningSessions.userId, user.id)));
    if ((sessionCount[0]?.value ?? 0) >= assignment.attemptsAllowed) return redirectAntwort(request, "/?error=aufgaben_limit");

    resolvedCollectionId = assignment.collectionId;
    resolvedGroupId = assignment.groupId;
  } else {
    const membershipRows = await db.select({ groupId: groupMemberships.groupId }).from(groupMemberships).where(eq(groupMemberships.userId, user.id));
    const groupIds = membershipRows.map((r) => r.groupId);

    const accessCondition = groupIds.length
      ? or(eq(contentCollections.ownerUserId, user.id), eq(contentCollections.visibility, "public"), inArray(contentCollections.groupId, groupIds))
      : or(eq(contentCollections.ownerUserId, user.id), eq(contentCollections.visibility, "public"));

    const collectionRows = await db.select({ id: contentCollections.id, groupId: contentCollections.groupId })
      .from(contentCollections).where(and(eq(contentCollections.id, collectionId), accessCondition)).limit(1);

    const collection = collectionRows[0];
    if (!collection) return redirectAntwort(request, "/?error=collection_verboten");
    resolvedGroupId = collection.groupId;
  }

  const exerciseCount = await db.select({ value: count() }).from(exercises).where(eq(exercises.collectionId, resolvedCollectionId));
  if ((exerciseCount[0]?.value ?? 0) === 0) return redirectAntwort(request, "/?error=keine_uebungen");

  const inserted = await db.insert(learningSessions).values({
    userId: user.id, assignmentId: assignmentId || null,
    collectionId: resolvedCollectionId, groupId: resolvedGroupId, mode, status: "active",
  }).returning({ id: learningSessions.id });

  await db.insert(learningEvents).values({
    userId: user.id, groupId: resolvedGroupId, assignmentId: assignmentId || null,
    sessionId: inserted[0].id, eventType: "session_started", payload: { mode },
  });

  return redirectAntwort(request, `/lernen/${inserted[0].id}`);
}
