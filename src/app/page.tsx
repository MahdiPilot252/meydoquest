import Image from "next/image";
import Link from "next/link";
import { asc } from "drizzle-orm";
import { db } from "@/db";
import { subjects } from "@/db/schema";
import { getOptionalUser, isTeacherLike } from "@/lib/auth/guards";
import { ensurePlatformSetup } from "@/lib/bootstrap";
import { getDashboardData } from "@/lib/data/dashboard";
import { getPlatformSettings } from "@/lib/data/platform";
import { CardCreator } from "@/components/card-creator";
import { InstallAppButton } from "@/components/install-app-button";

export const dynamic = "force-dynamic";

const MSG: Record<string, { t: string; ok: boolean }> = {
  collectionCreated: { t: "Vokabelset erstellt!", ok: true },
  groupCreated: { t: "Gruppe erstellt! Code steht unten.", ok: true },
  joined: { t: "Erfolgreich beigetreten!", ok: true },
  announcementCreated: { t: "Gruppen-Nachricht gesendet!", ok: true },
  assignmentCreated: { t: "Aufgabe veröffentlicht!", ok: true },
  ungueltige_gruppe: { t: "Gruppenname zu kurz.", ok: false },
  ungueltiger_code: { t: "Ungültiger Code.", ok: false },
  code_nicht_gefunden: { t: "Code nicht gefunden.", ok: false },
  code_abgelaufen: { t: "Code abgelaufen.", ok: false },
  code_verbraucht: { t: "Code verbraucht.", ok: false },
  ungueltige_vokabeln: { t: "Name + mindestens ein Paar eingeben.", ok: false },
  aufgabe_verboten: { t: "Keine Berechtigung.", ok: false },
  aufgaben_limit: { t: "Aufgabenlimit erreicht.", ok: false },
  collection_verboten: { t: "Kein Zugriff.", ok: false },
  keine_uebungen: { t: "Keine Übungen in diesem Set.", ok: false },
};

function skinBg(h: number) {
  return `linear-gradient(135deg,hsl(${h} 90% 68%),hsl(${h} 70% 42%))`;
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await ensurePlatformSetup();
  const [user, settings] = await Promise.all([getOptionalUser(), getPlatformSettings()]);

  if (!user) {
    if (settings.maintenanceMode) {
      return (
        <main className="flex min-h-screen flex-col items-center justify-center bg-[#090d16] px-4 text-center">
          <div className="max-w-lg rounded-3xl border border-rose-500/20 bg-rose-500/8 p-8">
            <h1 className="text-3xl font-bold text-white">Wartungsmodus aktiv</h1>
            <p className="mt-3 text-slate-300">Die Plattform wird gerade vom Admin bearbeitet. Bitte versuche es später erneut.</p>
            <Link href="/anmelden" className="mt-6 inline-flex rounded-2xl border border-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/5">Admin-Anmeldung</Link>
          </div>
        </main>
      );
    }

    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-[#090d16] px-4">
        {settings.logoData ? (
          <Image
            src={settings.logoData}
            alt={`${settings.siteName} Logo`}
            width={96}
            height={96}
            unoptimized
            className="h-24 w-24 rounded-[1.6rem] object-cover shadow-[0_0_50px_rgba(0,245,160,.2)]"
          />
        ) : (
          <div className="grid h-20 w-20 place-items-center rounded-[1.6rem] bg-[linear-gradient(180deg,#1ef0a1,#00a86a)] text-3xl font-black text-slate-950 shadow-[0_0_50px_rgba(0,245,160,.3)]">
            M
          </div>
        )}
        <h1 className="mt-6 text-5xl font-extrabold text-white sm:text-6xl">{settings.siteName}</h1>
        <p className="mt-3 text-center text-lg text-slate-400">{settings.slogan}</p>
        {settings.allowRegistrations ? (
          <form action="/api/auth/register" method="post" className="mt-10 flex w-full max-w-xs flex-col gap-3">
            <input
              type="text"
              name="username"
              required
              minLength={3}
              placeholder="Benutzername"
              className="rounded-2xl border border-white/10 bg-white/6 px-5 py-4 text-lg text-white outline-none placeholder:text-slate-500 focus:border-emerald-400/50"
            />
            <input
              type="password"
              name="password"
              required
              minLength={6}
              placeholder="Passwort (min. 6)"
              className="rounded-2xl border border-white/10 bg-white/6 px-5 py-4 text-lg text-white outline-none placeholder:text-slate-500 focus:border-emerald-400/50"
            />
            <button type="submit" className="rounded-2xl bg-emerald-400 py-4 text-xl font-bold text-slate-950 hover:bg-emerald-300 active:scale-[.98]">
              Kostenlos starten
            </button>
          </form>
        ) : (
          <div className="mt-10 w-full max-w-xs rounded-2xl border border-amber-500/20 bg-amber-500/8 px-5 py-4 text-center text-sm font-semibold text-amber-200">
            Neue Registrierungen sind aktuell deaktiviert.
          </div>
        )}
        <p className="mt-6 text-slate-500">
          Schon dabei? <Link href="/anmelden" className="font-semibold text-emerald-400">Anmelden</Link>
        </p>
      </main>
    );
  }

  if (settings.maintenanceMode && user.platformRole !== "super_admin") {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-[#090d16] px-4 text-center">
        <div className="max-w-lg rounded-3xl border border-rose-500/20 bg-rose-500/8 p-8">
          <h1 className="text-3xl font-bold text-white">Wartungsmodus aktiv</h1>
          <p className="mt-3 text-slate-300">Die Plattform ist gerade vorübergehend geschlossen. Bitte versuche es später erneut.</p>
        </div>
      </main>
    );
  }

  const [d, faecher, params] = await Promise.all([
    getDashboardData(user.id),
    db.select({ slug: subjects.slug, name: subjects.name }).from(subjects).orderBy(asc(subjects.name)),
    searchParams,
  ]);

  const hue = d.user?.avatarHue ?? user.profile?.avatarHue ?? 140;
  const avatarData = d.user?.avatarData ?? user.profile?.avatarData;
  const xp = d.user?.xpTotal ?? 0;
  const streak = d.user?.streakCount ?? 0;
  const coins = d.user?.coinsTotal ?? 0;
  const aktivesLogo = d.dueReviewCount > 0 && settings.sadLogoData ? settings.sadLogoData : settings.logoData;

  const lehrer = d.memberships.filter((m) => isTeacherLike(m.membershipRole));
  const codes = new Map<string, string>();
  for (const inv of d.activeInvites) {
    if (!codes.has(inv.groupId)) codes.set(inv.groupId, inv.code);
  }

  const errKey = typeof params.error === "string" ? params.error : null;
  const bk = Object.keys(MSG).find((k) => params[k] === "1") ?? (errKey && MSG[errKey] ? errKey : null);
  const banner = bk ? MSG[bk] : null;

  return (
    <div className="flex min-h-screen flex-col bg-[#090d16]">
      <nav className="sticky top-0 z-50 flex items-center justify-between border-b border-white/6 bg-[#090d16]/95 px-4 py-3 backdrop-blur-md sm:px-6">
        <div className="flex items-center gap-2">
          {aktivesLogo ? (
            <Image src={aktivesLogo} alt={`${settings.siteName} Logo`} width={36} height={36} unoptimized className="h-9 w-9 rounded-xl object-cover" />
          ) : (
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-400 text-base font-black text-slate-950">M</div>
          )}
          <span className="hidden font-bold text-white sm:block">{settings.siteName}</span>
        </div>

        <div className="flex items-center gap-4 text-sm font-bold">
          <span className="text-amber-400">🔥 {streak}</span>
          <span className="text-violet-300">⚡ {xp}</span>
          <span className="hidden sm:inline text-yellow-300">🪙 {coins}</span>
        </div>

        <div className="flex items-center gap-3">
          <InstallAppButton />
          <Link href="/support" className="rounded-full border border-white/8 px-2.5 py-1 text-xs font-bold text-slate-300 hover:bg-white/5">Support</Link>
          {user.platformRole === "super_admin" && (
            <Link href="/admin" className="rounded-full bg-rose-500/15 px-2.5 py-1 text-xs font-bold text-rose-300 hover:bg-rose-500/25">Admin</Link>
          )}
          <Link href="/konto" className="group" title="Profil, Avatar & Passwort">
            {avatarData ? (
              <Image src={avatarData} alt="Avatar" width={40} height={40} unoptimized className="h-10 w-10 rounded-full object-cover shadow-[0_0_15px_rgba(0,0,0,0.5)] transition group-hover:scale-105" />
            ) : (
              <div className="grid h-10 w-10 place-items-center rounded-full text-sm font-bold text-slate-950 shadow-[0_0_15px_rgba(0,0,0,0.5)] transition group-hover:scale-105" style={{ background: skinBg(hue) }}>
                {user.displayName.slice(0, 1).toUpperCase()}
              </div>
            )}
          </Link>
        </div>
      </nav>

      {banner ? (
        <div className={`px-4 py-3 text-center text-sm font-bold ${banner.ok ? "bg-emerald-500/10 text-emerald-300" : "bg-rose-500/10 text-rose-300"}`}>
          {banner.t}
        </div>
      ) : null}

      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-10 px-4 py-8 pb-24">
        {(d.accessibleCollections.length > 0 || d.upcomingAssignments.length > 0) && (
          <section className="space-y-4">
            <h2 className="text-xl font-bold text-white">📚 Deine Vokabeln</h2>
            {d.accessibleCollections.map((col) => (
              <form key={col.id} action="/api/sessions" method="post">
                <input type="hidden" name="collectionId" value={col.id} />
                <button type="submit" className="flex w-full items-center justify-between gap-4 rounded-3xl border border-white/8 bg-white/4 p-5 text-left transition hover:bg-white/8 active:scale-[0.98]">
                  <div className="min-w-0">
                    <p className="truncate text-lg font-bold text-white">{col.title}</p>
                    <p className="mt-1 text-sm text-slate-400">{col.subjectName ?? "Allgemein"}</p>
                  </div>
                  <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-emerald-400 pl-0.5 text-lg text-slate-950">▶</div>
                </button>
              </form>
            ))}
            {d.upcomingAssignments.map((a) => (
              <form key={a.id} action="/api/sessions" method="post">
                <input type="hidden" name="assignmentId" value={a.id} />
                <button type="submit" className="flex w-full items-center justify-between gap-4 rounded-3xl border border-amber-500/20 bg-amber-500/5 p-5 text-left transition hover:bg-amber-500/10 active:scale-[0.98]">
                  <div className="min-w-0">
                    <p className="text-xs font-bold uppercase tracking-widest text-amber-400">Aufgabe</p>
                    <p className="mt-1 truncate text-lg font-bold text-white">{a.title}</p>
                    <p className="text-sm text-slate-400">{a.groupName}</p>
                  </div>
                  <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-amber-400 pl-0.5 text-lg text-slate-950">▶</div>
                </button>
              </form>
            ))}
          </section>
        )}

        <section>
          <h2 className="text-xl font-bold text-white">✏️ Karten erstellen</h2>
          <p className="mt-1 text-sm text-slate-500">Gib Vorderseite und Rückseite ein. Eine Karte nach der anderen. Wenn du fertig bist, drückst du Speichern.</p>
          <div className="mt-4">
            <CardCreator />
          </div>
        </section>

        <section>
          <h2 className="text-xl font-bold text-white">👥 Gruppe beitreten</h2>
          <form action="/api/groups/join" method="post" className="mt-4 flex gap-2 rounded-3xl border border-white/8 bg-white/3 p-3">
            <input type="text" name="code" required placeholder="Gruppencode" className="min-w-0 flex-1 rounded-2xl bg-transparent px-4 py-2 font-mono text-lg uppercase tracking-widest text-white outline-none placeholder:normal-case placeholder:tracking-normal placeholder:text-slate-500" />
            <button type="submit" className="rounded-2xl bg-white/10 px-5 py-3 font-bold text-white hover:bg-white/15 active:scale-[0.98]">Beitreten</button>
          </form>
          {d.memberships.length > 0 ? (
            <div className="mt-4 space-y-2">
              {d.memberships.map((m) => {
                const code = codes.get(m.groupId);
                return (
                  <div key={m.groupId} className="flex items-center justify-between rounded-2xl border border-white/6 bg-white/3 p-4">
                    <div>
                      <p className="font-bold text-white">{m.groupName}</p>
                      <p className="text-xs text-slate-500">{isTeacherLike(m.membershipRole) ? "Du bist Lehrkraft" : "Mitglied"}</p>
                    </div>
                    {code && isTeacherLike(m.membershipRole) ? (
                      <span className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 font-mono text-sm font-bold text-emerald-300">{code}</span>
                    ) : null}
                  </div>
                );
              })}
            </div>
          ) : null}
        </section>

        <section>
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-bold text-white">🔔 Gruppen-Nachrichten</h2>
            <span className="text-xs font-bold text-slate-500">{d.recentAnnouncements.length} Einträge</span>
          </div>
          <div className="mt-4 space-y-3">
            {d.recentAnnouncements.length ? (
              d.recentAnnouncements.map((eintrag: (typeof d.recentAnnouncements)[number]) => (
                <div key={eintrag.id} className="rounded-2xl border border-white/6 bg-white/3 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-bold text-white">{eintrag.title}</p>
                    <span className="text-xs text-slate-500">{eintrag.groupName}</span>
                  </div>
                  <p className="mt-2 text-sm text-slate-300">{eintrag.message}</p>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-white/6 bg-white/3 p-4 text-sm text-slate-500">Noch keine Gruppen-Nachrichten.</div>
            )}
          </div>
          {lehrer.length > 0 ? (
            <form action="/api/groups/announcements" method="post" className="mt-4 space-y-3 rounded-3xl border border-white/8 bg-white/3 p-5">
              <h3 className="font-bold text-white">Nachricht an Gruppe senden</h3>
              <select name="groupId" className="w-full rounded-2xl border border-white/10 bg-[#0f1524] px-4 py-3 text-white outline-none">
                {lehrer.map((g) => (
                  <option key={g.groupId} value={g.groupId}>{g.groupName}</option>
                ))}
              </select>
              <input type="text" name="title" required placeholder="Titel der Nachricht" className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-slate-500" />
              <textarea name="message" rows={4} required placeholder="Nachricht an die Gruppe" className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-slate-500" />
              <button type="submit" className="w-full rounded-2xl bg-sky-400 py-3 font-bold text-slate-950 hover:bg-sky-300 active:scale-[0.98]">Nachricht senden</button>
            </form>
          ) : null}
        </section>

        <section>
          <h2 className="text-xl font-bold text-white">🏫 Neue Gruppe erstellen</h2>
          <p className="mt-1 text-sm text-slate-500">Normale Nutzer können hier direkt Gruppen erstellen. Danach sind sie automatisch Lehrkraft und bekommen sofort einen Gruppencode.</p>
          <form action="/api/groups" method="post" className="mt-4 space-y-3 rounded-3xl border border-white/8 bg-white/3 p-5">
            <input type="text" name="name" required placeholder="Gruppenname (z. B. Englisch 8b)" className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:border-emerald-400/50" />
            <div className="grid grid-cols-2 gap-3">
              <select name="kind" defaultValue="classroom" className="rounded-2xl border border-white/10 bg-[#0f1524] px-4 py-3 text-white outline-none">
                <option value="classroom">Klasse</option>
                <option value="study_group">Lerngruppe</option>
                <option value="course">Kurs</option>
              </select>
              <select name="subjectSlug" defaultValue="english" className="rounded-2xl border border-white/10 bg-[#0f1524] px-4 py-3 text-white outline-none">
                {faecher.map((f) => (
                  <option key={f.slug} value={f.slug}>{f.name}</option>
                ))}
              </select>
            </div>
            <button type="submit" className="w-full rounded-2xl border border-white/10 py-3 font-semibold text-white hover:bg-white/5 active:scale-[0.98]">Gruppe erstellen</button>
          </form>
        </section>

        {lehrer.length > 0 ? (
          <section>
            <h2 className="text-xl font-bold text-white">📝 Aufgabe veröffentlichen</h2>
            <p className="mt-1 text-sm text-slate-500">Wähle eine Gruppe und ein Set — Schüler sehen es als Aufgabe.</p>
            <form action="/api/assignments" method="post" className="mt-4 space-y-3 rounded-3xl border border-white/8 bg-white/3 p-5">
              <input type="text" name="title" required placeholder="Aufgabentitel" className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:border-emerald-400/50" />
              <div className="grid grid-cols-2 gap-3">
                <select name="groupId" className="rounded-2xl border border-white/10 bg-[#0f1524] px-4 py-3 text-white outline-none">
                  {lehrer.map((g) => (
                    <option key={g.groupId} value={g.groupId}>{g.groupName}</option>
                  ))}
                </select>
                <select name="collectionId" className="rounded-2xl border border-white/10 bg-[#0f1524] px-4 py-3 text-white outline-none">
                  {d.accessibleCollections.map((c) => (
                    <option key={c.id} value={c.id}>{c.title}</option>
                  ))}
                </select>
              </div>
              <input type="datetime-local" name="dueAt" className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none" />
              <button type="submit" className="w-full rounded-2xl bg-amber-400/80 py-3 font-semibold text-slate-950 hover:bg-amber-400 active:scale-[0.98]">Veröffentlichen</button>
            </form>
          </section>
        ) : null}

        <section className="rounded-3xl border border-white/6 bg-white/3 p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-white">❓ Hilfe & Support</h2>
            <Link href="/support" className="rounded-xl border border-white/10 px-3 py-2 text-sm font-semibold text-white hover:bg-white/5">Zum Support</Link>
          </div>
          <div className="mt-4 space-y-3 text-sm text-slate-400">
            <div className="rounded-2xl border border-white/6 bg-white/3 p-4">
              <p className="font-bold text-white">Wie lerne ich Vokabeln?</p>
              <p className="mt-1">Tippe oben auf der Startseite unter &quot;Vokabeln setzen&quot; deine Wörter ein, zum Beispiel apple = Apfel. Drücke auf &quot;Erstellen &amp; lernen&quot;. Fertig — du wirst direkt abgefragt.</p>
            </div>
            <div className="rounded-2xl border border-white/6 bg-white/3 p-4">
              <p className="font-bold text-white">Wie trete ich einer Klasse bei?</p>
              <p className="mt-1">Frage deinen Lehrer nach dem Gruppencode. Tippe ihn unter &quot;Gruppe beitreten&quot; ein. Danach siehst du Aufgaben deiner Klasse.</p>
            </div>
            <div className="rounded-2xl border border-white/6 bg-white/3 p-4">
              <p className="font-bold text-white">Wie erstelle ich eine Klasse?</p>
              <p className="mt-1">Scrolle zu &quot;Neue Gruppe erstellen&quot; und gib einen Namen ein. Du bekommst sofort einen Code, den du an deine Schüler weitergibst.</p>
            </div>
            <div className="rounded-2xl border border-white/6 bg-white/3 p-4">
              <p className="font-bold text-white">Wie ändere ich mein Passwort oder meinen Avatar?</p>
              <p className="mt-1">Klicke oben rechts auf deinen farbigen Avatar-Kreis. Dort kannst du Name, Skin-Farbe und Passwort ändern.</p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
