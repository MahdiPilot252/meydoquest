import Link from "next/link";
import { db } from "@/db";
import { profiles } from "@/db/schema";
import { requireUser } from "@/lib/auth/guards";
import { eq } from "drizzle-orm";
import { AvatarPainter } from "@/components/avatar-painter";

const ERR: Record<string, string> = {
  zu_viele_versuche: "Zu viele Änderungen. Bitte warte kurz.",
  ungueltiges_profil: "Name muss mindestens 2 Zeichen haben.",
  ungueltiges_passwort: "Neues Passwort muss mindestens 6 Zeichen haben.",
  falsches_passwort: "Aktuelles Passwort ist falsch.",
  benutzer_fehlt: "Konto nicht gefunden.",
};

function skinBg(h: number) {
  return `linear-gradient(135deg,hsl(${h} 90% 68%),hsl(${h} 70% 42%))`;
}

export const dynamic = "force-dynamic";

export default async function KontoPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const profil = await db.select().from(profiles).where(eq(profiles.userId, user.id)).limit(1);
  const p = profil[0] ?? null;
  const hue = p?.avatarHue ?? 140;
  const errorKey = typeof params.error === "string" ? params.error : "";
  const error = ERR[errorKey];

  return (
    <div className="flex min-h-screen flex-col bg-[#090d16]">
      {/* Nav */}
      <nav className="flex items-center justify-between border-b border-white/6 px-4 py-3 sm:px-6">
        <Link href="/" className="text-sm font-semibold text-emerald-400 hover:text-emerald-300">← Zurück</Link>
        <span className="text-sm text-slate-400">Konto · {user.username}</span>
      </nav>

      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-8 px-4 py-8 pb-24">

        {/* Erfolgsmeldungen */}
        {params.saved === "1" && <div className="rounded-2xl bg-emerald-500/10 px-4 py-3 text-center text-sm font-bold text-emerald-300">Profil gespeichert!</div>}
        {params.passwordSaved === "1" && <div className="rounded-2xl bg-emerald-500/10 px-4 py-3 text-center text-sm font-bold text-emerald-300">Passwort geändert!</div>}
        {error && <div className="rounded-2xl bg-rose-500/10 px-4 py-3 text-center text-sm font-bold text-rose-300">{error}</div>}

        {/* ── AVATAR & PROFIL ── */}
        <section className="rounded-3xl border border-white/8 bg-white/3 p-6">
          <div className="flex items-center gap-5">
            <div className="grid h-20 w-20 shrink-0 place-items-center rounded-full text-3xl font-bold text-slate-950 shadow-lg" style={{ background: skinBg(hue) }}>
              {user.displayName.slice(0, 1).toUpperCase()}
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{user.displayName}</p>
              <p className="text-sm text-slate-400">@{user.username}</p>
              {user.platformRole === "super_admin" && <p className="mt-1 text-xs font-bold text-rose-400">Admin</p>}
            </div>
          </div>

          <form action="/api/konto" method="post" className="mt-6 space-y-4">
            <input type="hidden" name="action" value="profil" />
            <label className="block space-y-2">
              <span className="text-sm font-medium text-slate-300">Anzeigename</span>
              <input type="text" name="displayName" defaultValue={user.displayName} required className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-emerald-400/50" />
            </label>
              <div>
                <span className="text-sm font-medium text-slate-300 mb-2 block">Dein Avatar</span>
                <AvatarPainter defaultData={p?.avatarData ?? undefined} hue={hue} initialLetter={user.displayName.slice(0, 1).toUpperCase()} />
              </div>
            <button type="submit" className="w-full rounded-2xl bg-emerald-400 py-3 font-bold text-slate-950 hover:bg-emerald-300 active:scale-[0.98]">Profil speichern</button>
          </form>
        </section>

        {/* ── PASSWORT ── */}
        <section className="rounded-3xl border border-white/8 bg-white/3 p-6">
          <h2 className="text-lg font-bold text-white">🔒 Passwort ändern</h2>
          <form action="/api/konto" method="post" className="mt-4 space-y-4">
            <input type="hidden" name="action" value="passwort" />
            <label className="block space-y-2">
              <span className="text-sm font-medium text-slate-300">Aktuelles Passwort</span>
              <input type="password" name="currentPassword" required className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-emerald-400/50" />
            </label>
            <label className="block space-y-2">
              <span className="text-sm font-medium text-slate-300">Neues Passwort</span>
              <input type="password" name="newPassword" required minLength={6} className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-emerald-400/50" />
            </label>
            <button type="submit" className="w-full rounded-2xl border border-white/10 py-3 font-semibold text-white hover:bg-white/5 active:scale-[0.98]">Passwort ändern</button>
          </form>
        </section>

        {/* ── ABMELDEN ── */}
        <form action="/api/auth/logout" method="post">
          <button type="submit" className="w-full rounded-2xl border border-rose-500/20 bg-rose-500/5 py-3 font-semibold text-rose-300 hover:bg-rose-500/10 active:scale-[0.98]">Abmelden</button>
        </form>
      </main>
    </div>
  );
}
