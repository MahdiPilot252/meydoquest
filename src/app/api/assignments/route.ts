import { and, eq, or } from "drizzle-orm";
import { db } from "@/db";
import { assignments, contentCollections, learningEvents } from "@/db/schema";
import { requireTeacherMembership } from "@/lib/auth/guards";
import { getCurrentUser } from "@/lib/auth/session";
import { redirectAntwort } from "@/lib/http";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return redirectAntwort(request, "/anmelden");

  const formData = await request.formData();
  const groupId = String(formData.get("groupId") ?? "");
  const collectionId = String(formData.get("collectionId") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const instructions = String(formData.get("instructions") ?? "").trim();
  const dueAtRaw = String(formData.get("dueAt") ?? "").trim();

  if (!groupId || !collectionId || title.length < 3) return redirectAntwort(request, "/?error=ungueltige_aufgabe");

  try {
    await requireTeacherMembership(user.id, groupId);
  } catch {
    return redirectAntwort(request, "/?error=verbotene_aufgabe");
  }

  const collectionRows = await db
    .select({ id: contentCollections.id }).from(contentCollections)
    .where(and(eq(contentCollections.id, collectionId),
               or(eq(contentCollections.ownerUserId, user.id), eq(contentCollections.visibility, "public"),
                  eq(contentCollections.groupId, groupId)))).limit(1);

  if (!collectionRows[0]) return redirectAntwort(request, "/?error=collection_nicht_verfuegbar");

  const dueAt = dueAtRaw ? new Date(dueAtRaw) : null;
  const inserted = await db.insert(assignments).values({
    groupId, collectionId, createdBy: user.id, title,
    instructions: instructions || null, startAt: new Date(),
    dueAt: dueAt && !Number.isNaN(dueAt.getTime()) ? dueAt : null,
    status: "published", attemptsAllowed: 1,
  }).returning({ id: assignments.id });

  await db.insert(learningEvents).values({
    userId: user.id, groupId, assignmentId: inserted[0].id,
    eventType: "assignment_created", payload: { title },
  });

  return redirectAntwort(request, "/?assignmentCreated=1");
}
