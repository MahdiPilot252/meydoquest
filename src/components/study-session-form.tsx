"use client";

import { useRef, useState } from "react";

type ExerciseOption = {
  id: string;
  label: string;
};

type StudyExercise = {
  id: string;
  type: "flashcard" | "text_input" | "single_choice" | "multiple_select" | "true_false" | "numeric" | "cloze";
  title: string;
  prompt: string;
  content: {
    options?: ExerciseOption[];
    front?: string;
    back?: string;
  };
};

export function StudySessionForm({
  sessionId,
  exercise,
  progressLabel,
}: {
  sessionId: string;
  exercise: StudyExercise;
  progressLabel: string;
}) {
  const [startedAt] = useState(() => Date.now());
  const responseTimeRef = useRef<HTMLInputElement | null>(null);
  const [revealed, setRevealed] = useState(false);

  return (
    <form
      action={`/api/sessions/${sessionId}/answer`}
      method="post"
      className="space-y-6"
      onSubmit={() => {
        if (responseTimeRef.current) {
          responseTimeRef.current.value = String(Date.now() - startedAt);
        }
      }}
    >
      <input ref={responseTimeRef} type="hidden" name="responseTimeMs" defaultValue="0" />

      <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300">
        <span>{progressLabel}</span>
        <span>Sicherheit</span>
      </div>

      {(exercise.type === "text_input" || exercise.type === "cloze" || exercise.type === "flashcard") && (
        <div className="space-y-4">
          {exercise.type === "flashcard" && (
            <div className="rounded-3xl border border-emerald-400/30 bg-emerald-400/10 p-5 text-emerald-50">
              <p className="text-xs uppercase tracking-[0.3em] text-emerald-200/80">Karteikarte</p>
              <p className="mt-3 text-2xl font-semibold">{exercise.content.front ?? exercise.title}</p>
              <button
                type="button"
                className="mt-4 rounded-full border border-emerald-300/40 px-4 py-2 text-sm font-medium text-emerald-100 transition hover:bg-emerald-300/10"
                onClick={() => setRevealed((value) => !value)}
              >
                {revealed ? "Antwort ausblenden" : "Antwort zeigen"}
              </button>
              {revealed && exercise.content.back ? (
                <p className="mt-4 rounded-2xl bg-black/20 p-3 text-base text-emerald-100">{exercise.content.back}</p>
              ) : null}
            </div>
          )}

          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-200">Deine Antwort</span>
            <input
              type="text"
              name="textAnswer"
              required
              autoComplete="off"
              className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-slate-50 outline-none transition focus:border-emerald-400/60"
              placeholder="Antwort eingeben"
            />
          </label>
        </div>
      )}

      {exercise.type === "single_choice" && (
        <fieldset className="space-y-3">
          <legend className="text-sm font-medium text-slate-200">Wähle eine Antwort</legend>
          {exercise.content.options?.map((option) => (
            <label
              key={option.id}
              className="flex cursor-pointer items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-slate-100 transition hover:border-emerald-400/40 hover:bg-emerald-400/5"
            >
              <input type="radio" name="selectedOptionId" value={option.id} required className="accent-emerald-400" />
              <span>{option.label}</span>
            </label>
          ))}
        </fieldset>
      )}

      {exercise.type === "multiple_select" && (
        <fieldset className="space-y-3">
          <legend className="text-sm font-medium text-slate-200">Wähle alle richtigen Antworten</legend>
          {exercise.content.options?.map((option) => (
            <label
              key={option.id}
              className="flex cursor-pointer items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-slate-100 transition hover:border-emerald-400/40 hover:bg-emerald-400/5"
            >
              <input type="checkbox" name="selectedOptionIds" value={option.id} className="accent-emerald-400" />
              <span>{option.label}</span>
            </label>
          ))}
        </fieldset>
      )}

      {exercise.type === "true_false" && (
        <fieldset className="grid gap-3 sm:grid-cols-2">
          {[
            { label: "Wahr", value: "true" },
            { label: "Falsch", value: "false" },
          ].map((option) => (
            <label
              key={option.value}
              className="flex cursor-pointer items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-slate-100 transition hover:border-emerald-400/40 hover:bg-emerald-400/5"
            >
              <input type="radio" name="booleanAnswer" value={option.value} required className="accent-emerald-400" />
              <span>{option.label}</span>
            </label>
          ))}
        </fieldset>
      )}

      {exercise.type === "numeric" && (
        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-200">Numerische Antwort</span>
          <input
            type="number"
            name="numericAnswer"
            step="any"
            required
            className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-slate-50 outline-none transition focus:border-emerald-400/60"
            placeholder="Zahl eingeben"
          />
        </label>
      )}

      <label className="block space-y-2">
        <span className="text-sm font-medium text-slate-200">Wie sicher bist du dir?</span>
        <select
          name="confidence"
          defaultValue="2"
          className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-slate-50 outline-none transition focus:border-emerald-400/60"
        >
          <option value="1">1 · geraten</option>
          <option value="2">2 · eher unsicher</option>
          <option value="3">3 · ziemlich sicher</option>
          <option value="4">4 · ganz sicher</option>
        </select>
      </label>

      <button
        type="submit"
        className="inline-flex w-full items-center justify-center rounded-2xl bg-emerald-400 px-5 py-3 font-semibold text-slate-950 transition hover:bg-emerald-300"
      >
        Antwort absenden
      </button>
    </form>
  );
}
