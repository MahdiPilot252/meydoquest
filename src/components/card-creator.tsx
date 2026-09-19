"use client";

import { useState } from "react";

type Karte = { vorne: string; hinten: string };

export function CardCreator() {
  const [karten, setKarten] = useState<Karte[]>([]);
  const [vorne, setVorne] = useState("");
  const [hinten, setHinten] = useState("");
  const [titel, setTitel] = useState("");
  const [fertig, setFertig] = useState(false);

  function karteHinzufuegen() {
    if (!vorne.trim() || !hinten.trim()) return;
    setKarten([...karten, { vorne: vorne.trim(), hinten: hinten.trim() }]);
    setVorne("");
    setHinten("");
  }

  function karteEntfernen(index: number) {
    setKarten(karten.filter((_, i) => i !== index));
  }

  if (fertig && karten.length > 0) {
    const pairs = karten.map((k) => `${k.vorne} = ${k.hinten}`).join("\n");
    return (
      <form action="/api/collections" method="post">
        <input type="hidden" name="title" value={titel || "Meine Karten"} />
        <input type="hidden" name="pairs" value={pairs} />
        <input type="hidden" name="subjectSlug" value="english" />
        <input type="hidden" name="visibility" value="private" />
        <input type="hidden" name="groupId" value="" />

        <div className="space-y-3">
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/8 p-4 text-center">
            <p className="text-lg font-bold text-white">{karten.length} Karten bereit</p>
            <p className="mt-1 text-sm text-slate-400">{titel || "Meine Karten"}</p>
          </div>

          <div className="grid gap-2">
            {karten.map((k, i) => (
              <div key={i} className="flex items-center justify-between rounded-xl border border-white/6 bg-white/4 px-4 py-2 text-sm">
                <span className="text-white">{k.vorne}</span>
                <span className="text-slate-400">→</span>
                <span className="text-emerald-300">{k.hinten}</span>
              </div>
            ))}
          </div>

          <button type="submit" className="w-full rounded-2xl bg-emerald-400 py-4 text-lg font-bold text-slate-950 hover:bg-emerald-300 active:scale-[0.98]">
            Speichern & direkt lernen
          </button>
          <button type="button" onClick={() => setFertig(false)} className="w-full rounded-2xl border border-white/10 py-3 text-sm font-semibold text-white hover:bg-white/5">
            Zurück zum Bearbeiten
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="space-y-4">
      {/* Titel */}
      <input
        type="text"
        value={titel}
        onChange={(e) => setTitel(e.target.value)}
        placeholder="Name deines Sets (optional)"
        className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:border-emerald-400/50"
      />

      {/* Karte eingeben */}
      <div className="rounded-3xl border border-white/8 bg-white/3 p-5">
        <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Karte {karten.length + 1}</p>
        <div className="mt-3 grid gap-3">
          <input
            type="text"
            value={vorne}
            onChange={(e) => setVorne(e.target.value)}
            placeholder="Vorderseite (z.B. apple)"
            autoFocus
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); document.getElementById("hinten-input")?.focus(); } }}
            className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3.5 text-lg text-white outline-none placeholder:text-slate-500 focus:border-emerald-400/50"
          />
          <input
            id="hinten-input"
            type="text"
            value={hinten}
            onChange={(e) => setHinten(e.target.value)}
            placeholder="Rückseite (z.B. Apfel)"
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); karteHinzufuegen(); } }}
            className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3.5 text-lg text-white outline-none placeholder:text-slate-500 focus:border-emerald-400/50"
          />
        </div>
        <button
          type="button"
          onClick={karteHinzufuegen}
          disabled={!vorne.trim() || !hinten.trim()}
          className="mt-3 w-full rounded-2xl bg-white/10 py-3 font-bold text-white transition hover:bg-white/15 active:scale-[0.98] disabled:opacity-30"
        >
          + Karte hinzufügen
        </button>
      </div>

      {/* Bisherige Karten */}
      {karten.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400">{karten.length} Karte{karten.length > 1 ? "n" : ""}</p>
          {karten.map((k, i) => (
            <div key={i} className="flex items-center justify-between rounded-2xl border border-white/6 bg-white/4 px-4 py-3">
              <div className="flex items-center gap-3 text-sm">
                <span className="font-bold text-white">{k.vorne}</span>
                <span className="text-slate-500">→</span>
                <span className="text-emerald-300">{k.hinten}</span>
              </div>
              <button type="button" onClick={() => karteEntfernen(i)} className="text-xs text-rose-400 hover:text-rose-300">✕</button>
            </div>
          ))}

          <button
            type="button"
            onClick={() => setFertig(true)}
            className="mt-2 w-full rounded-2xl bg-emerald-400 py-3.5 font-bold text-slate-950 hover:bg-emerald-300 active:scale-[0.98]"
          >
            Fertig — Set speichern
          </button>
        </div>
      )}
    </div>
  );
}
