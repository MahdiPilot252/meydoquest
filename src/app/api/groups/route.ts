import { eq } from "drizzle-orm";
import { db } from "@/db";
import { groupInvites, groupMemberships, groups, learningEvents, subjects } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth/session";
import { redirectAntwort } from "@/lib/http";
import { createInviteCode, slugify } from "@/lib/utils";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return redirectAntwort(request, "/anmelden");

  const formData = await request.formData();
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const subjectSlug = String(formData.get("subjectSlug") ?? "").trim();
  const kind = String(formData.get("kind") ?? "classroom");

  if (name.length < 3) return redirectAntwort(request, "/?error=ungueltige_gruppe");

  const subjectRows = subjectSlug
    ? await db.select({ id: subjects.id }).from(subjects).where(eq(subjects.slug, subjectSlug)).limit(1)
    : [];
  const subjectId = subjectRows[0]?.id ?? null;

  const slug = `${slugify(name) || "meydo-gruppe"}-${Date.now().toString().slice(-6)}`;
  const groupInserted = await db
    .insert(groups)
    .values({
      name,
      description: description || null,
      subjectId,
      kind: kind === "course" || kind === "study_group" || kind === "community" ? kind : "classroom",
      slug,
      createdBy: user.id,
    })
    .returning({ id: groups.id, name: groups.name });

  const groupId = groupInserted[0].id;
  const inviteCode = createInviteCode();

  await db.insert(groupMemberships).values({ groupId, userId: user.id, role: "teacher" });
  await db.insert(groupInvites).values({ groupId, code: inviteCode, role: "student", createdBy: user.id });
  await db.insert(learningEvents).values({
    userId: user.id, groupId, eventType: "group_created",
    payload: { groupName: groupInserted[0].name, inviteCode },
  });

  return redirectAntwort(request, "/?groupCreated=1");
}
