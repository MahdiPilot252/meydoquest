"use client";

import { useState } from "react";

type MatchCard = { front: string; back: string };

export function MatchGame({ cards }: { cards: MatchCard[] }) {
  const items = cards.slice(0, 6);
  const [leftSelected, setLeftSelected] = useState<number | null>(null);
  const [matched, setMatched] = useState<Set<number>>(new Set());
  const [wrongPair, setWrongPair] = useState<[number, number] | null>(null);
  const [shuffledRight] = useState(() => {
    const indices = items.map((_, i) => i);
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    return indices;
  });

  if (items.length < 3) {
    return <p className="text-sm text-slate-500">Mindestens 3 Karten für das Zuordnungsspiel nötig.</p>;
  }

  const allMatched = matched.size === items.length;

  function selectLeft(index: number) {
    if (matched.has(index)) return;
    setLeftSelected(index);
    setWrongPair(null);
  }

  function selectRight(rightIndex: number) {
    if (leftSelected === null) return;
    const actualIndex = shuffledRight[rightIndex];
    if (matched.has(actualIndex)) return;

    if (leftSelected === actualIndex) {
      setMatched((prev) => new Set([...prev, actualIndex]));
      setLeftSelected(null);
      setWrongPair(null);
    } else {
      setWrongPair([leftSelected, rightIndex]);
      setTimeout(() => { setWrongPair(null); setLeftSelected(null); }, 800);
    }
  }

  if (allMatched) {
    return (
      <div className="text-center space-y-4">
        <div className="text-4xl">🎉</div>
        <h3 className="text-xl font-bold text-white">Alles zugeordnet!</h3>
        <button onClick={() => { setMatched(new Set()); setLeftSelected(null); }} className="rounded-2xl bg-emerald-400 px-6 py-3 font-bold text-slate-950 hover:bg-emerald-300">
          Nochmal
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-xs uppercase tracking-widest text-slate-500 text-center">Tippe links und dann rechts um zuzuordnen</p>
      <div className="grid grid-cols-2 gap-3">
        {/* Linke Spalte */}
        <div className="space-y-2">
          {items.map((item, i) => (
            <button
              key={`l-${i}`}
              onClick={() => selectLeft(i)}
              disabled={matched.has(i)}
              className={`w-full rounded-2xl border p-3 text-center font-semibold transition ${
                matched.has(i)
                  ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300 opacity-50"
                  : leftSelected === i
                    ? "border-emerald-400 bg-emerald-400/20 text-emerald-300"
                    : wrongPair && wrongPair[0] === i
                      ? "border-rose-400 bg-rose-400/20 text-rose-300"
                      : "border-white/10 bg-white/5 text-white hover:border-white/20"
              }`}
            >
              {item.front}
            </button>
          ))}
        </div>

        {/* Rechte Spalte (gemischt) */}
        <div className="space-y-2">
          {shuffledRight.map((actualIdx, rightIdx) => (
            <button
              key={`r-${rightIdx}`}
              onClick={() => selectRight(rightIdx)}
              disabled={matched.has(actualIdx)}
              className={`w-full rounded-2xl border p-3 text-center font-semibold transition ${
                matched.has(actualIdx)
                  ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300 opacity-50"
                  : wrongPair && wrongPair[1] === rightIdx
                    ? "border-rose-400 bg-rose-400/20 text-rose-300"
                    : "border-white/10 bg-white/5 text-white hover:border-white/20"
              }`}
            >
              {items[actualIdx].back}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
