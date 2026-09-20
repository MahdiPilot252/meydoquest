"use client";

const LEVELS = [
  { level: 1, xp: 0,    title: "Anfänger",      belohnung: "🥉 Bronze-Rahmen", color: "from-slate-600 to-slate-800" },
  { level: 2, xp: 50,   title: "Lernling",       belohnung: "✨ Glitzer-Effekt", color: "from-emerald-700 to-emerald-900" },
  { level: 3, xp: 150,  title: "Wissens-Sucher", belohnung: "🥈 Silber-Rahmen", color: "from-sky-600 to-sky-800" },
  { level: 4, xp: 300,  title: "Vokabel-Held",   belohnung: "🎨 Exklusive Farbe", color: "from-violet-600 to-violet-800" },
  { level: 5, xp: 500,  title: "Quiz-Meister",   belohnung: "🥇 Gold-Rahmen", color: "from-amber-600 to-amber-800" },
  { level: 6, xp: 800,  title: "Sprach-Krieger", belohnung: "💎 Diamant-Titel", color: "from-cyan-500 to-cyan-700" },
  { level: 7, xp: 1200, title: "Lern-Legende",   belohnung: "👑 Krone", color: "from-yellow-500 to-amber-600" },
  { level: 8, xp: 2000, title: "meydoQuest Champion", belohnung: "🏆 Champion-Badge", color: "from-rose-500 to-rose-700" },
];

export function BattlePass({ xp, streak }: { xp: number; streak: number }) {
  const currentLevel = LEVELS.filter((l) => xp >= l.xp).pop() ?? LEVELS[0];
  const nextLevel = LEVELS.find((l) => l.xp > xp);
  const progress = nextLevel ? ((xp - currentLevel.xp) / (nextLevel.xp - currentLevel.xp)) * 100 : 100;

  return (
    <div className="space-y-4">
      {/* Aktuelles Level */}
      <div className={`rounded-3xl bg-gradient-to-r ${currentLevel.color} p-5 text-center`}>
        <p className="text-xs uppercase tracking-widest text-white/60">meydoQuest Pass · Level {currentLevel.level}</p>
        <p className="mt-2 text-2xl font-bold text-white">{currentLevel.title}</p>
        <p className="mt-1 text-sm text-white/70">Belohnung: {currentLevel.belohnung}</p>
      </div>

      {/* Fortschritt */}
      {nextLevel && (
        <div>
          <div className="flex items-center justify-between text-sm text-slate-400">
            <span>Level {currentLevel.level}</span>
            <span>{xp} / {nextLevel.xp} XP</span>
            <span>Level {nextLevel.level}</span>
          </div>
          <div className="mt-2 h-4 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-sky-400 transition-all duration-500"
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
          <p className="mt-2 text-center text-sm text-slate-500">
            Noch <span className="font-bold text-white">{nextLevel.xp - xp} XP</span> bis: {nextLevel.belohnung}
          </p>
        </div>
      )}

      {/* Alle Level */}
      <div className="grid grid-cols-4 gap-2">
        {LEVELS.map((l) => (
          <div
            key={l.level}
            className={`rounded-2xl border p-3 text-center ${
              xp >= l.xp
                ? "border-emerald-500/30 bg-emerald-500/10"
                : "border-white/6 bg-white/3 opacity-40"
            }`}
          >
            <p className="text-lg">{l.belohnung.split(" ")[0]}</p>
            <p className="mt-1 text-xs font-bold text-white">Lv.{l.level}</p>
            <p className="text-[10px] text-slate-500">{l.xp} XP</p>
          </div>
        ))}
      </div>

      {/* Streak-Bonus */}
      <div className="flex items-center justify-between rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
        <div>
          <p className="font-bold text-white">🔥 Streak-Bonus</p>
          <p className="text-sm text-slate-400">{streak} Tage in Folge gelernt</p>
        </div>
        <span className="text-2xl font-bold text-amber-400">×{Math.min(1 + streak * 0.1, 2).toFixed(1)}</span>
      </div>
    </div>
  );
}
