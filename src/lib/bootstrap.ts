import { and, eq, or, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  achievements,
  contentCollections,
  exercises,
  learningItems,
  learningItemSkills,
  platformSettings,
  profiles,
  skills,
  subjects,
  users,
} from "@/db/schema";
import { hashPassword } from "@/lib/auth/hash";
import { DEFAULT_ACHIEVEMENTS } from "@/lib/learning/rewards";

const ADMIN_USER = "MahdiPilot";
const ADMIN_PASS = "MahdiPilot3";
const STARTER_COLLECTION_TITLE = "Vokabel-Starter • Englisch & Französisch";
const LEGACY_STARTER_COLLECTION_TITLE = "Language Launch Pack • English & French Foundations";

export async function ensurePlatformSetup() {
  await db.execute(sql`select pg_advisory_lock(42424242)`);

  try {
    await ensureAchievementCatalog();
    const adminUserId = await ensureAdminUser();
    await ensurePlatformSettings(adminUserId);
    const subjectMap = await ensureSubjects(adminUserId);
    const skillMap = await ensureSkills(adminUserId, subjectMap);
    await ensureStarterCollection(adminUserId, subjectMap, skillMap);
  } finally {
    await db.execute(sql`select pg_advisory_unlock(42424242)`);
  }
}

async function ensureAchievementCatalog() {
  for (const achievement of DEFAULT_ACHIEVEMENTS) {
    await db.insert(achievements).values(achievement).onConflictDoNothing();
    await db
      .update(achievements)
      .set({
        name: achievement.name,
        description: achievement.description,
        icon: achievement.icon,
        conditionType: achievement.conditionType,
        threshold: achievement.threshold,
      })
      .where(eq(achievements.slug, achievement.slug));
  }
}

async function ensureAdminUser() {
  // Prüfen, ob MahdiPilot schon existiert
  const existing = await db.select({ id: users.id }).from(users).where(eq(users.username, ADMIN_USER.toLowerCase())).limit(1);

  if (existing[0]) {
    // Falls er existiert, sicherstellen dass er Admin ist (falls jemand die Rolle manipuliert hat)
    await db.update(users).set({ platformRole: "super_admin" }).where(eq(users.id, existing[0].id));
    return existing[0].id;
  }

  // Admin erstellen
  const passwordHash = await hashPassword(ADMIN_PASS);
  const inserted = await db
    .insert(users)
    .values({
      username: ADMIN_USER.toLowerCase(),
      passwordHash,
      displayName: ADMIN_USER,
      platformRole: "super_admin",
    })
    .returning({ id: users.id });

  await db.insert(profiles).values({ userId: inserted[0].id, preferredLanguage: "de", avatarHue: 200 }).onConflictDoNothing();

  return inserted[0].id;
}

async function ensurePlatformSettings(adminUserId: string) {
  await db
    .insert(platformSettings)
    .values({
      key: "global",
      siteName: "meydoQuest",
      slogan: "Vokabeln lernen. Sofort loslegen.",
      supportInfo: "Bei Problemen kannst du unten auf Support tippen und ein Ticket schreiben.",
      sadLogoData: null,
      allowRegistrations: true,
      maintenanceMode: false,
      updatedBy: adminUserId,
      updatedAt: new Date(),
    })
    .onConflictDoNothing();
}

async function ensureSubjects(systemUserId: string) {
  const subjectDefs = [
    {
      slug: "english",
      name: "Englisch",
      description: "Sprachenlernen mit Vokabeln, Grammatik, Lesen, Hören und Kommunikation.",
      icon: "🇬🇧",
      languageCode: "en",
    },
    {
      slug: "french",
      name: "Französisch",
      description: "Französisch lernen mit Vokabeln, Aussprache, Verständnis und Schreiben.",
      icon: "🇫🇷",
      languageCode: "fr",
    },
    {
      slug: "mathematics",
      name: "Mathematik",
      description: "Zahlen, Algebra, Geometrie, Wahrscheinlichkeit und Problemlösen.",
      icon: "📐",
      languageCode: null,
    },
    {
      slug: "programming",
      name: "Programmierung",
      description: "Code, Algorithmen, Debugging, Softwareentwicklung und Informatik.",
      icon: "💻",
      languageCode: null,
    },
  ] as const;

  for (const subject of subjectDefs) {
    await db
      .insert(subjects)
      .values({
        ...subject,
        isSystem: true,
        createdBy: systemUserId,
      })
      .onConflictDoNothing();

    await db
      .update(subjects)
      .set({
        name: subject.name,
        description: subject.description,
        icon: subject.icon,
        languageCode: subject.languageCode,
      })
      .where(eq(subjects.slug, subject.slug));
  }

  const subjectRows = await db.select({ id: subjects.id, slug: subjects.slug }).from(subjects);
  return new Map(subjectRows.map((subject) => [subject.slug, subject.id]));
}

async function ensureSkills(systemUserId: string, subjectMap: Map<string, string>) {
  const skillDefs = [
    {
      name: "Englisch Grundwortschatz",
      legacyName: "Core English Vocabulary",
      subjectSlug: "english",
      description: "Alltägliche englische Vokabeln erinnern, erkennen und schreiben.",
      difficulty: 1,
      learningObjectives: ["remember", "recognize", "translate", "write"],
    },
    {
      name: "Französisch Grundwortschatz",
      legacyName: "Core French Vocabulary",
      subjectSlug: "french",
      description: "Alltägliche französische Vokabeln erinnern, erkennen und schreiben.",
      difficulty: 1,
      learningObjectives: ["remember", "recognize", "translate", "write"],
    },
    {
      name: "Übersetzungsgrundlagen",
      legacyName: "Translation Basics",
      subjectSlug: "english",
      description: "Bedeutungen sauber zwischen Sprachen übertragen und vergleichen.",
      difficulty: 2,
      learningObjectives: ["understand", "translate", "compare"],
    },
  ] as const;

  for (const skill of skillDefs) {
    const subjectId = subjectMap.get(skill.subjectSlug);

    if (!subjectId) {
      continue;
    }

    const existing = await db
      .select({ id: skills.id, name: skills.name })
      .from(skills)
      .where(
        and(
          eq(skills.subjectId, subjectId),
          or(eq(skills.name, skill.name), eq(skills.name, skill.legacyName)),
        ),
      )
      .limit(1);

    if (!existing[0]) {
      await db.insert(skills).values({
        subjectId,
        name: skill.name,
        description: skill.description,
        difficulty: skill.difficulty,
        learningObjectives: [...skill.learningObjectives],
        createdBy: systemUserId,
      });
    } else {
      await db
        .update(skills)
        .set({
          name: skill.name,
          description: skill.description,
          difficulty: skill.difficulty,
          learningObjectives: [...skill.learningObjectives],
        })
        .where(eq(skills.id, existing[0].id));
    }
  }

  const skillRows = await db.select({ id: skills.id, name: skills.name }).from(skills);
  return new Map(skillRows.map((skill) => [skill.name, skill.id]));
}

async function ensureStarterCollection(
  systemUserId: string,
  subjectMap: Map<string, string>,
  skillMap: Map<string, string>,
) {
  const existingCollection = await db
    .select({ id: contentCollections.id, title: contentCollections.title })
    .from(contentCollections)
    .where(
      or(
        eq(contentCollections.title, STARTER_COLLECTION_TITLE),
        eq(contentCollections.title, LEGACY_STARTER_COLLECTION_TITLE),
      ),
    )
    .limit(1);

  let collectionId = existingCollection[0]?.id;

  if (!collectionId) {
    const inserted = await db
      .insert(contentCollections)
      .values({
        ownerUserId: systemUserId,
        subjectId: subjectMap.get("english") ?? null,
        title: STARTER_COLLECTION_TITLE,
        description: "Öffentliches Starterset für Englisch- und Französisch-Vokabeln.",
        visibility: "public",
        status: "published",
      })
      .returning({ id: contentCollections.id });

    collectionId = inserted[0].id;
  } else {
    await db
      .update(contentCollections)
      .set({
        title: STARTER_COLLECTION_TITLE,
        description: "Öffentliches Starterset für Englisch- und Französisch-Vokabeln.",
        subjectId: subjectMap.get("english") ?? null,
        visibility: "public",
        status: "published",
        updatedAt: new Date(),
      })
      .where(eq(contentCollections.id, collectionId));
  }

  const existingItems = await db
    .select({
      id: learningItems.id,
      canonicalAnswer: learningItems.canonicalAnswer,
    })
    .from(learningItems)
    .where(eq(learningItems.collectionId, collectionId))
    .limit(20);

  const byAnswer = new Map(existingItems.map((item) => [item.canonicalAnswer ?? "", item.id]));

  const itemDefs = [
    // Deutsch → Englisch
    { title: "Schule", prompt: "Übersetze ins Englische.", canonicalAnswer: "school", explanation: "Schule = school", languageFrom: "de", languageTo: "en", itemData: { translations: ["school"], examples: ["Ich gehe zur Schule."] } },
    { title: "Hausaufgabe", prompt: "Übersetze ins Englische.", canonicalAnswer: "homework", explanation: "Hausaufgabe = homework", languageFrom: "de", languageTo: "en", itemData: { translations: ["homework"], examples: ["Hast du deine Hausaufgaben?"] } },
    { title: "Freund", prompt: "Übersetze ins Englische.", canonicalAnswer: "friend", explanation: "Freund = friend", languageFrom: "de", languageTo: "en", itemData: { translations: ["friend"], examples: ["Er ist mein bester Freund."] } },
    // Deutsch → Französisch
    { title: "Hund", prompt: "Übersetze ins Französische.", canonicalAnswer: "chien", explanation: "Hund = chien", languageFrom: "de", languageTo: "fr", itemData: { translations: ["chien"], examples: ["Der Hund ist groß."] } },
    { title: "Haus", prompt: "Übersetze ins Französische.", canonicalAnswer: "maison", explanation: "Haus = maison", languageFrom: "de", languageTo: "fr", itemData: { translations: ["maison", "la maison"], examples: ["Das Haus ist alt."] } },
  ] as const;

  for (const item of itemDefs) {
    const subjectId = subjectMap.get(item.languageTo === "fr" ? "french" : "english") ?? null;
    const primarySkillId =
      item.languageTo === "fr"
        ? skillMap.get("Französisch Grundwortschatz") ?? null
        : skillMap.get("Englisch Grundwortschatz") ?? null;
    const translationSkillId = skillMap.get("Übersetzungsgrundlagen") ?? null;

    let learningItemId = byAnswer.get(item.canonicalAnswer) ?? null;

    if (!learningItemId) {
      const insertedItem = await db
        .insert(learningItems)
        .values({
          collectionId,
          subjectId,
          primarySkillId,
          type: "term",
          title: item.title,
          prompt: item.prompt,
          canonicalAnswer: item.canonicalAnswer,
          explanation: item.explanation,
          languageFrom: item.languageFrom,
          languageTo: item.languageTo,
          itemData: item.itemData,
        })
        .returning({ id: learningItems.id });
      learningItemId = insertedItem[0].id;
    } else {
      await db
        .update(learningItems)
        .set({
          subjectId,
          primarySkillId,
          title: item.title,
          prompt: item.prompt,
          canonicalAnswer: item.canonicalAnswer,
          explanation: item.explanation,
          languageFrom: item.languageFrom,
          languageTo: item.languageTo,
          itemData: item.itemData,
        })
        .where(eq(learningItems.id, learningItemId));
    }

    if (primarySkillId) {
      await db.insert(learningItemSkills).values({ learningItemId, skillId: primarySkillId }).onConflictDoNothing();
    }

    if (translationSkillId) {
      await db.insert(learningItemSkills).values({ learningItemId, skillId: translationSkillId }).onConflictDoNothing();
    }

    const existingExercises = await db
      .select({ id: exercises.id, type: exercises.type })
      .from(exercises)
      .where(eq(exercises.learningItemId, learningItemId));

    if (!existingExercises.length) {
      await db.insert(exercises).values([
        {
          collectionId,
          learningItemId,
          subjectId,
          skillId: primarySkillId,
          type: "text_input",
          title: `${item.title} • Schreiben`,
          prompt: `${item.title}: ${item.prompt}`,
          content: { mode: "typed_recall" },
          validatorType: "multiple_valid_answers",
          validatorConfig: { acceptedAnswers: [item.canonicalAnswer, ...(item.itemData.translations ?? [])] },
          explanation: item.explanation,
          difficulty: 1,
        },
        {
          collectionId,
          learningItemId,
          subjectId,
          skillId: primarySkillId,
          type: "single_choice",
          title: `${item.title} • Erkennen`,
          prompt: `Wähle die beste Antwort für „${item.title}“.`,
          content: {
            options: buildOptionSet(item.canonicalAnswer, itemDefs.map((entry) => entry.canonicalAnswer)),
          },
          validatorType: "single_choice",
          validatorConfig: { correctOptionId: item.canonicalAnswer },
          explanation: item.explanation,
          difficulty: 1,
        },
        {
          collectionId,
          learningItemId,
          subjectId,
          skillId: primarySkillId,
          type: "flashcard",
          title: `${item.title} • Karteikarte`,
          prompt: `Denke nach und prüfe dich selbst: ${item.title}`,
          content: {
            front: item.title,
            back: item.canonicalAnswer,
          },
          validatorType: "normalized_text",
          validatorConfig: { expected: item.canonicalAnswer },
          explanation: item.explanation,
          difficulty: 1,
        },
      ]);
    } else {
      for (const existingExercise of existingExercises) {
        if (existingExercise.type === "text_input") {
          await db
            .update(exercises)
            .set({
              title: `${item.title} • Schreiben`,
              prompt: `${item.title}: ${item.prompt}`,
              subjectId,
              skillId: primarySkillId,
              content: { mode: "typed_recall" },
              validatorType: "multiple_valid_answers",
              validatorConfig: { acceptedAnswers: [item.canonicalAnswer, ...(item.itemData.translations ?? [])] },
              explanation: item.explanation,
              difficulty: 1,
            })
            .where(eq(exercises.id, existingExercise.id));
        }

        if (existingExercise.type === "single_choice") {
          await db
            .update(exercises)
            .set({
              title: `${item.title} • Erkennen`,
              prompt: `Wähle die beste Antwort für „${item.title}“.`,
              subjectId,
              skillId: primarySkillId,
              content: { options: buildOptionSet(item.canonicalAnswer, itemDefs.map((entry) => entry.canonicalAnswer)) },
              validatorType: "single_choice",
              validatorConfig: { correctOptionId: item.canonicalAnswer },
              explanation: item.explanation,
              difficulty: 1,
            })
            .where(eq(exercises.id, existingExercise.id));
        }

        if (existingExercise.type === "flashcard") {
          await db
            .update(exercises)
            .set({
              title: `${item.title} • Karteikarte`,
              prompt: `Denke nach und prüfe dich selbst: ${item.title}`,
              subjectId,
              skillId: primarySkillId,
              content: { front: item.title, back: item.canonicalAnswer },
              validatorType: "normalized_text",
              validatorConfig: { expected: item.canonicalAnswer },
              explanation: item.explanation,
              difficulty: 1,
            })
            .where(eq(exercises.id, existingExercise.id));
        }
      }
    }
  }
}

function buildOptionSet(correctAnswer: string, allAnswers: readonly string[]) {
  const distractors = allAnswers.filter((answer) => answer !== correctAnswer).slice(0, 3);
  const options = [correctAnswer, ...distractors].map((value) => ({ id: value, label: value }));
  return options.sort((a, b) => a.label.localeCompare(b.label));
}
