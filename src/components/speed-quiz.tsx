"use client";

import { useCallback, useEffect, useState } from "react";

type QuizCard = { front: string; back: string };

export function SpeedQuiz({ cards }: { cards: QuizCard[] }) {
  const [pool, setPool] = useState<QuizCard[]>([]);
  const [current, setCurrent] = useState<QuizCard | null>(null);
  const [options, setOptions] = useState<string[]>([]);
  const [score, setScore] = useState(0);
  const [total, setTotal] = useState(0);
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  const [timeLeft, setTimeLeft] = useState(60);
  const [started, setStarted] = useState(false);
  const [finished, setFinished] = useState(false);

  const nextQuestion = useCallback(() => {
    if (cards.length < 2) return;
    const card = cards[Math.floor(Math.random() * cards.length)];
    const wrongs = cards.filter((c) => c.back !== card.back).sort(() => Math.random() - 0.5).slice(0, 3).map((c) => c.back);
    const opts = [card.back, ...wrongs].sort(() => Math.random() - 0.5);
    setCurrent(card);
    setOptions(opts);
    setFeedback(null);
  }, [cards]);

  useEffect(() => {
    if (!started || finished) return;
    if (timeLeft <= 0) { setFinished(true); return; }
    const t = setTimeout(() => setTimeLeft((v) => v - 1), 1000);
    return () => clearTimeout(t);
  }, [started, finished, timeLeft]);

  function start() {
    setStarted(true);
    setFinished(false);
    setScore(0);
    setTotal(0);
    setTimeLeft(60);
    nextQuestion();
  }

  function answer(chosen: string) {
    if (!current || feedback) return;
    const correct = chosen === current.back;
    setFeedback(correct ? "correct" : "wrong");
    if (correct) setScore((s) => s + 1);
    setTotal((t) => t + 1);
    setTimeout(() => { nextQuestion(); }, correct ? 400 : 1200);
  }

  if (cards.length < 4) {
    return <p className="text-sm text-slate-500">Mindestens 4 Karten nötig für das Speed-Quiz.</p>;
  }

  if (!started) {
    return (
      <div className="text-center space-y-4">
        <div className="text-4xl">⚡</div>
        <h3 className="text-xl font-bold text-white">Speed-Quiz</h3>
        <p className="text-sm text-slate-400">60 Sekunden. So viele richtige Antworten wie möglich.</p>
        <button onClick={start} className="rounded-2xl bg-emerald-400 px-6 py-3 font-bold text-slate-950 hover:bg-emerald-300 active:scale-95">
          Start!
        </button>
      </div>
    );
  }

  if (finished) {
    return (
      <div className="text-center space-y-4">
        <div className="text-4xl">🏆</div>
        <h3 className="text-xl font-bold text-white">Ergebnis</h3>
        <p className="text-3xl font-bold text-emerald-400">{score} / {total}</p>
        <p className="text-sm text-slate-400">richtige Antworten in 60 Sekunden</p>
        <button onClick={start} className="rounded-2xl bg-emerald-400 px-6 py-3 font-bold text-slate-950 hover:bg-emerald-300 active:scale-95">
          Nochmal spielen
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Timer + Score */}
      <div className="flex items-center justify-between">
        <span className="text-lg font-bold text-white">⚡ {score}</span>
        <div className="h-2 flex-1 mx-4 rounded-full bg-white/10 overflow-hidden">
          <div className="h-full rounded-full bg-amber-400 transition-all" style={{ width: `${(timeLeft / 60) * 100}%` }} />
        </div>
        <span className={`text-lg font-bold ${timeLeft <= 10 ? "text-rose-400" : "text-white"}`}>{timeLeft}s</span>
      </div>

      {/* Frage */}
      {current && (
        <div className="text-center">
          <p className="text-xs uppercase tracking-widest text-slate-500">Was bedeutet...</p>
          <p className="mt-2 text-3xl font-bold text-white">{current.front}</p>
        </div>
      )}

      {/* Optionen */}
      <div className="grid grid-cols-2 gap-3">
        {options.map((opt) => (
          <button
            key={opt}
            onClick={() => answer(opt)}
            disabled={feedback !== null}
            className={`rounded-2xl border p-4 text-center font-semibold transition active:scale-95 ${
              feedback && opt === current?.back
                ? "border-emerald-400 bg-emerald-400/20 text-emerald-300"
                : feedback && opt !== current?.back
                  ? "border-white/5 bg-white/3 text-slate-500"
                  : "border-white/10 bg-white/5 text-white hover:border-emerald-400/40 hover:bg-white/8"
            }`}
          >
            {opt}
          </button>
        ))}
      </div>

      {feedback === "wrong" && (
        <p className="text-center text-sm font-bold text-rose-400">Falsch! Richtig wäre: {current?.back}</p>
      )}
    </div>
  );
}
