"use client";

import { useRef, useState } from "react";

type FlipExercise = {
  id: string;
  front: string;
  back: string;
};

export function FlipCard({
  sessionId,
  exercise,
  current,
  total,
}: {
  sessionId: string;
  exercise: FlipExercise;
  current: number;
  total: number;
}) {
  const [flipped, setFlipped] = useState(false);
  const [startedAt] = useState(() => Date.now());
  const responseTimeRef = useRef<HTMLInputElement | null>(null);

  function setTime() {
    if (responseTimeRef.current) {
      responseTimeRef.current.value = String(Date.now() - startedAt);
    }
  }

  return (
    <div className="mx-auto w-full max-w-md space-y-6">
      {/* Fortschritt */}
      <div className="flex items-center justify-between text-sm text-slate-400">
        <span>{current} / {total}</span>
        <div className="h-2 flex-1 mx-4 rounded-full bg-white/10 overflow-hidden">
          <div className="h-full rounded-full bg-emerald-400 transition-all" style={{ width: `${(current / total) * 100}%` }} />
        </div>
      </div>

      {/* Karte */}
      <button
        type="button"
        onClick={() => setFlipped(!flipped)}
        className="group w-full perspective-[800px]"
      >
        <div className={`relative h-56 w-full transition-transform duration-500 [transform-style:preserve-3d] ${flipped ? "[transform:rotateY(180deg)]" : ""}`}>
          {/* Vorderseite */}
          <div className="absolute inset-0 flex flex-col items-center justify-center rounded-3xl border border-white/10 bg-white/5 p-8 [backface-visibility:hidden]">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Vorderseite</p>
            <p className="mt-4 text-center text-3xl font-bold text-white">{exercise.front}</p>
            <p className="mt-6 text-sm text-slate-500">Tippe zum Umdrehen</p>
          </div>
          {/* Rückseite */}
          <div className="absolute inset-0 flex flex-col items-center justify-center rounded-3xl border border-emerald-500/20 bg-emerald-500/8 p-8 [backface-visibility:hidden] [transform:rotateY(180deg)]">
            <p className="text-xs font-bold uppercase tracking-widest text-emerald-400">Rückseite</p>
            <p className="mt-4 text-center text-3xl font-bold text-white">{exercise.back}</p>
          </div>
        </div>
      </button>

      {/* Buttons (nur wenn umgedreht) */}
      {flipped && (
        <div className="grid grid-cols-2 gap-3">
          {/* Nochmal (falsch) */}
          <form action={`/api/sessions/${sessionId}/answer`} method="post" onSubmit={setTime}>
            <input ref={responseTimeRef} type="hidden" name="responseTimeMs" value="0" />
            <input type="hidden" name="textAnswer" value="__wrong__" />
            <input type="hidden" name="confidence" value="1" />
            <button type="submit" className="w-full rounded-2xl border border-rose-500/30 bg-rose-500/10 py-4 text-lg font-bold text-rose-300 transition hover:bg-rose-500/20 active:scale-[0.97]">
              ✕ Nochmal
            </button>
          </form>

          {/* Gewusst (richtig) */}
          <form action={`/api/sessions/${sessionId}/answer`} method="post" onSubmit={setTime}>
            <input type="hidden" name="responseTimeMs" value="0" />
            <input type="hidden" name="textAnswer" value={exercise.back} />
            <input type="hidden" name="confidence" value="3" />
            <button type="submit" className="w-full rounded-2xl bg-emerald-400 py-4 text-lg font-bold text-slate-950 transition hover:bg-emerald-300 active:scale-[0.97]">
              ✓ Gewusst
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
