import Link from "next/link";
import { and, asc, desc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { attempts, contentCollections, exercises, learningSessions } from "@/db/schema";
import { requireUser } from "@/lib/auth/guards";
import { FlipCard } from "@/components/flip-card";

export const dynamic = "force-dynamic";

export default async function LernenSessionPage({
  params,
  searchParams,
}: {
  params: Promise<{ sessionId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  const { sessionId } = await params;
  const query = await searchParams;

  const sessionRows = await db
    .select({
      id: learningSessions.id,
      userId: learningSessions.userId,
      mode: learningSessions.mode,
      status: learningSessions.status,
      currentIndex: learningSessions.currentIndex,
      correctCount: learningSessions.correctCount,
      totalXpEarned: learningSessions.totalXpEarned,
      totalCoinsEarned: learningSessions.totalCoinsEarned,
      collectionId: learningSessions.collectionId,
      collectionTitle: contentCollections.title,
    })
    .from(learningSessions)
    .innerJoin(contentCollections, eq(learningSessions.collectionId, contentCollections.id))
    .where(and(eq(learningSessions.id, sessionId), eq(learningSessions.userId, user.id)))
    .limit(1);

  const session = sessionRows[0];
  if (!session || !session.collectionId) notFound();

  const sessionExercises = (await db
    .select({
      id: exercises.id,
      type: exercises.type,
      title: exercises.title,
      prompt: exercises.prompt,
      content: exercises.content,
    })
    .from(exercises)
    .where(eq(exercises.collectionId, session.collectionId))
    .orderBy(asc(exercises.createdAt), asc(exercises.title))) as Array<{
    id: string;
    type: string;
    title: string;
    prompt: string;
    content: { front?: string; back?: string; options?: { id: string; label: string }[] };
  }>;

  // Nur Karteikarten-Übungen anzeigen (eine pro Vokabel)
  const flashcards = sessionExercises.filter((e) => e.type === "flashcard");
  const allExercises = flashcards.length > 0 ? flashcards : sessionExercises;

  const recentAttempts = await db
    .select({ id: attempts.id, isCorrect: attempts.isCorrect, feedback: attempts.feedback })
    .from(attempts)
    .where(eq(attempts.sessionId, session.id))
    .orderBy(desc(attempts.ordinal))
    .limit(1);

  const currentExercise = allExercises[session.currentIndex];
  const abgeschlossen = session.status === "completed" || !currentExercise;
  const lastAttempt = recentAttempts[0] ?? null;

  return (
    <div className="flex min-h-screen flex-col bg-[#090d16]">
      {/* Nav */}
      <nav className="flex items-center justify-between border-b border-white/6 px-4 py-3 sm:px-6">
        <Link href="/" className="text-sm font-semibold text-emerald-400 hover:text-emerald-300">← Zurück</Link>
        <span className="text-sm text-slate-400">{session.collectionTitle}</span>
      </nav>

      {/* Feedback */}
      {query.answered === "1" && lastAttempt ? (
        <div className={`px-4 py-3 text-center text-sm font-bold ${lastAttempt.isCorrect ? "bg-emerald-500/10 text-emerald-300" : "bg-rose-500/10 text-rose-300"}`}>
          {lastAttempt.isCorrect ? "✓ Richtig!" : "✕ Nochmal üben."}
        </div>
      ) : null}

      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center px-4 py-8">
        {abgeschlossen ? (
          <div className="w-full space-y-6 text-center">
            <div className="text-5xl">🎉</div>
            <h1 className="text-3xl font-bold text-white">Fertig!</h1>
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-2xl border border-white/8 bg-white/4 p-4">
                <p className="text-2xl font-bold text-white">{session.correctCount}</p>
                <p className="text-xs text-slate-500">Richtig</p>
              </div>
              <div className="rounded-2xl border border-white/8 bg-white/4 p-4">
                <p className="text-2xl font-bold text-violet-300">{session.totalXpEarned}</p>
                <p className="text-xs text-slate-500">XP</p>
              </div>
              <div className="rounded-2xl border border-white/8 bg-white/4 p-4">
                <p className="text-2xl font-bold text-yellow-300">{session.totalCoinsEarned}</p>
                <p className="text-xs text-slate-500">Münzen</p>
              </div>
            </div>
            <Link href="/" className="inline-flex rounded-2xl bg-emerald-400 px-6 py-3 font-bold text-slate-950 hover:bg-emerald-300">
              Weiter lernen
            </Link>
          </div>
        ) : (
          <FlipCard
            sessionId={session.id}
            exercise={{
              id: currentExercise.id,
              front: currentExercise.content.front ?? currentExercise.title,
              back: currentExercise.content.back ?? currentExercise.prompt,
            }}
            current={session.currentIndex + 1}
            total={allExercises.length}
          />
        )}
      </main>
    </div>
  );
}
