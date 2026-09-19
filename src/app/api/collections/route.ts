import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { contentCollections, exercises, groupMemberships, learningEvents, learningItems, learningItemSkills, skills, subjects } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth/session";
import { redirectAntwort } from "@/lib/http";
import { slugify } from "@/lib/utils";

function parsePairs(raw: string) {
  return raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean).map((line) => {
    const sep = line.includes("\t") ? "\t" : line.includes("=") ? "=" : line.includes("|") ? "|" : ";";
    const [left, ...rest] = line.split(sep);
    return { prompt: (left ?? "").trim(), answer: rest.join(sep).trim() };
  }).filter((p) => p.prompt && p.answer).slice(0, 40);
}

function buildOptionSet(correct: string, all: string[]) {
  const distractors = all.filter((a) => a !== correct).slice(0, 3);
  return [correct, ...distractors].map((v) => ({ id: v, label: v })).sort((a, b) => a.label.localeCompare(b.label));
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return redirectAntwort(request, "/anmelden");

  const formData = await request.formData();
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const subjectSlugRaw = String(formData.get("subjectSlug") ?? "").trim();
  const customSubjectName = String(formData.get("customSubjectName") ?? "").trim();
  const visibility = String(formData.get("visibility") ?? "private");
  const groupId = String(formData.get("groupId") ?? "").trim();
  const pairs = parsePairs(String(formData.get("pairs") ?? ""));

  if (title.length < 3 || pairs.length === 0) return redirectAntwort(request, "/?error=ungueltige_vokabeln");

  let subjectId: string | null = null;
  if (customSubjectName) {
    const slug = `${slugify(customSubjectName)}-${Date.now().toString().slice(-6)}`;
    const ins = await db.insert(subjects).values({ slug, name: customSubjectName, description: `Eigenes Fach von ${user.displayName}`, isSystem: false, createdBy: user.id }).returning({ id: subjects.id });
    subjectId = ins[0].id;
  } else if (subjectSlugRaw) {
    const rows = await db.select({ id: subjects.id }).from(subjects).where(eq(subjects.slug, subjectSlugRaw)).limit(1);
    subjectId = rows[0]?.id ?? null;
  }

  const shareWithGroup = visibility === "group" && Boolean(groupId);
  if (shareWithGroup) {
    const memRows = await db.select({ groupId: groupMemberships.groupId }).from(groupMemberships)
      .where(and(eq(groupMemberships.groupId, groupId), eq(groupMemberships.userId, user.id))).limit(1);
    if (!memRows[0]) return redirectAntwort(request, "/?error=gruppenfreigabe_verboten");
  }

  const col = await db.insert(contentCollections).values({
    ownerUserId: user.id, groupId: shareWithGroup ? groupId : null, subjectId, title,
    description: description || null, visibility: shareWithGroup ? "group" : "private", status: "published",
  }).returning({ id: contentCollections.id });

  const collectionId = col[0].id;
  const sk = await db.insert(skills).values({ subjectId, name: `${title} • Kernskill`, description: `Übungsskill für ${title}.`, difficulty: 1, learningObjectives: ["remember", "understand", "apply"], createdBy: user.id }).returning({ id: skills.id });
  const skillId = sk[0].id;
  const allAnswers = pairs.map((p) => p.answer);

  for (const pair of pairs) {
    const item = await db.insert(learningItems).values({
      collectionId, subjectId, primarySkillId: skillId, type: "concept",
      title: pair.prompt, prompt: `Beantworte: ${pair.prompt}`,
      canonicalAnswer: pair.answer, explanation: pair.answer, itemData: { acceptedAnswers: [pair.answer] },
    }).returning({ id: learningItems.id });

    await db.insert(learningItemSkills).values({ learningItemId: item[0].id, skillId }).onConflictDoNothing();
    await db.insert(exercises).values([
      { collectionId, learningItemId: item[0].id, subjectId, skillId, type: "text_input", title: `${pair.prompt} • Schreiben`, prompt: pair.prompt, content: { mode: "typed" }, validatorType: "multiple_valid_answers", validatorConfig: { acceptedAnswers: [pair.answer] }, explanation: pair.answer },
      { collectionId, learningItemId: item[0].id, subjectId, skillId, type: "single_choice", title: `${pair.prompt} • Erkennen`, prompt: `Wähle die richtige Antwort für: ${pair.prompt}`, content: { options: buildOptionSet(pair.answer, allAnswers) }, validatorType: "single_choice", validatorConfig: { correctOptionId: pair.answer }, explanation: pair.answer },
      { collectionId, learningItemId: item[0].id, subjectId, skillId, type: "flashcard", title: `${pair.prompt} • Karteikarte`, prompt: `Karteikarte: ${pair.prompt}`, content: { front: pair.prompt, back: pair.answer }, validatorType: "normalized_text", validatorConfig: { expected: pair.answer }, explanation: pair.answer },
    ]);
  }

  await db.insert(learningEvents).values({ userId: user.id, groupId: shareWithGroup ? groupId : null, eventType: "content_collection_created", payload: { title, pairCount: pairs.length } });
  return redirectAntwort(request, "/?collectionCreated=1");
}
