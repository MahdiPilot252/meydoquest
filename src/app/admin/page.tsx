import NextImage from "next/image";
import Link from "next/link";
import { desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  contentCollections,
  groups,
  learningEvents,
  platformSettings,
  profiles,
  supportTicketMessages,
  supportTickets,
  users,
} from "@/db/schema";
import { requireAdmin } from "@/lib/auth/guards";

export const dynamic = "force-dynamic";

const statusText: Record<string, string> = {
  open: "Offen",
  in_progress: "In Bearbeitung",
  resolved: "Gelöst",
  closed: "Geschlossen",
};

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const admin = await requireAdmin();
  const params = await searchParams;

  const [settingsRows, alleNutzer, alleGruppen, alleSets, letzteEvents, tickets, statsResult] = await Promise.all([
    db.select().from(platformSettings).where(eq(platformSettings.key, "global")).limit(1),
    db
      .select({
        id: users.id,
        username: users.username,
        displayName: users.displayName,
        platformRole: users.platformRole,
        createdAt: users.createdAt,
        xpTotal: profiles.xpTotal,
        streakCount: profiles.streakCount,
      })
      .from(users)
      .leftJoin(profiles, eq(profiles.userId, users.id))
      .orderBy(desc(users.createdAt))
      .limit(200),
    db.select().from(groups).orderBy(desc(groups.createdAt)).limit(100),
    db.select().from(contentCollections).orderBy(desc(contentCollections.createdAt)).limit(150),
    db
      .select({ id: learningEvents.id, eventType: learningEvents.eventType, createdAt: learningEvents.createdAt })
      .from(learningEvents)
      .orderBy(desc(learningEvents.createdAt))
      .limit(40),
    db.select().from(supportTickets).orderBy(desc(supportTickets.updatedAt), desc(supportTickets.createdAt)).limit(80),
    db.execute(sql`
      select
        (select count(*) from users) as nutzer,
        (select count(*) from groups) as gruppen,
        (select count(*) from content_collections) as sets,
        (select count(*) from attempts) as antworten,
        (select count(*) from learning_events) as events,
        (select count(*) from support_tickets) as tickets
    `),
  ]);

  const settings = settingsRows[0] ?? null;
  const ticketIds = tickets.map((ticket) => ticket.id);
  const ticketMessages = ticketIds.length
    ? await db
        .select()
        .from(supportTicketMessages)
        .where(inArray(supportTicketMessages.ticketId, ticketIds))
        .orderBy(desc(supportTicketMessages.createdAt))
    : [];
  const stats = statsResult.rows[0] ?? {};

  return (
    <div className="min-h-screen bg-[#090d16]">
      <nav className="flex items-center justify-between border-b border-rose-500/15 bg-rose-500/5 px-4 py-3 sm:px-6">
        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-rose-400">Admin-Zentrale</span>
          <span className="ml-2 text-sm text-white">{admin.displayName}</span>
        </div>
        <Link href="/" className="rounded-xl border border-white/10 px-3 py-1.5 text-sm text-white hover:bg-white/5">
          ← Zurück
        </Link>
      </nav>

      <main className="mx-auto max-w-6xl space-y-6 px-4 py-8">
        {(params.saved === "1" || typeof params.error === "string") && (
          <div className={`rounded-2xl px-4 py-3 text-sm font-bold ${params.saved === "1" ? "bg-emerald-500/10 text-emerald-300" : "bg-rose-500/10 text-rose-300"}`}>
            {params.saved === "1" ? "Admin-Änderung gespeichert." : "Admin-Aktion konnte nicht ausgeführt werden."}
          </div>
        )}

        <section className="rounded-3xl border border-white/8 bg-white/3 p-6">
          <h1 className="text-3xl font-bold text-white">Alles verwalten</h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-400">
            Hier kann der Admin Plattform-Branding, Nutzer, Gruppen, Sets und Support-Tickets steuern. Das ist die zentrale Kontrollseite für die gesamte Website.
          </p>
        </section>

        <section className="grid gap-3 md:grid-cols-6">
          {[
            ["Nutzer", stats.nutzer],
            ["Gruppen", stats.gruppen],
            ["Sets", stats.sets],
            ["Antworten", stats.antworten],
            ["Events", stats.events],
            ["Tickets", stats.tickets],
          ].map(([label, val]) => (
            <div key={String(label)} className="rounded-2xl border border-white/8 bg-white/4 p-4 text-center">
              <p className="text-2xl font-bold text-white">{String(val ?? 0)}</p>
              <p className="text-xs text-slate-500">{String(label)}</p>
            </div>
          ))}
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          <div className="rounded-3xl border border-white/8 bg-white/3 p-6">
            <h2 className="text-xl font-bold text-white">🎨 Website-Branding & Logo</h2>
            <p className="mt-2 text-sm text-slate-400">Der Admin kann Name, Slogan, Support-Kontakt und Website-Logo zentral ändern.</p>
            <form action="/api/admin/branding" method="post" encType="multipart/form-data" className="mt-5 space-y-4">
              <label className="block space-y-2">
                <span className="text-sm text-slate-300">Website-Name</span>
                <input type="text" name="siteName" defaultValue={settings?.siteName ?? "meydoQuest"} className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none" />
              </label>
              <label className="block space-y-2">
                <span className="text-sm text-slate-300">Slogan</span>
                <input type="text" name="slogan" defaultValue={settings?.slogan ?? "Vokabeln lernen. Sofort loslegen."} className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none" />
              </label>
              <label className="block space-y-2">
                <span className="text-sm text-slate-300">Website-Logo hochladen</span>
                <input type="file" name="logo" accept="image/png,image/jpeg,image/webp" className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300" />
              </label>
              <label className="block space-y-2">
                <span className="text-sm text-slate-300">Trauriges Logo hochladen</span>
                <input type="file" name="sadLogo" accept="image/png,image/jpeg,image/webp" className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300" />
              </label>
              <div className="flex gap-4">
                {settings?.logoData ? <NextImage src={settings.logoData} alt="Aktuelles Logo" width={80} height={80} unoptimized className="h-20 w-20 rounded-2xl object-cover" /> : null}
                {settings?.sadLogoData ? <NextImage src={settings.sadLogoData} alt="Trauriges Logo" width={80} height={80} unoptimized className="h-20 w-20 rounded-2xl object-cover" /> : null}
              </div>
              <label className="block space-y-2">
                <span className="text-sm text-slate-300">Support-E-Mail</span>
                <input type="text" name="supportEmail" defaultValue={settings?.supportEmail ?? ""} className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none" />
              </label>
              <label className="block space-y-2">
                <span className="text-sm text-slate-300">Support-Hinweis</span>
                <textarea name="supportInfo" rows={4} defaultValue={settings?.supportInfo ?? ""} className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none" />
              </label>
              <label className="flex items-center gap-3 text-sm text-slate-300">
                <input type="checkbox" name="allowRegistrations" defaultChecked={settings?.allowRegistrations ?? true} className="accent-emerald-400" />
                Registrierungen erlauben
              </label>
              <label className="flex items-center gap-3 text-sm text-slate-300">
                <input type="checkbox" name="maintenanceMode" defaultChecked={settings?.maintenanceMode ?? false} className="accent-rose-400" />
                Wartungsmodus aktivieren
              </label>
              <button type="submit" className="w-full rounded-2xl bg-emerald-400 py-3 font-bold text-slate-950 hover:bg-emerald-300">Branding speichern</button>
            </form>
          </div>

          <div className="rounded-3xl border border-white/8 bg-white/3 p-6">
            <h2 className="text-xl font-bold text-white">🔐 Admin-Rechte</h2>
            <p className="mt-2 text-sm text-slate-400">Admins können andere Nutzer zu Admins machen oder ihnen Rechte wieder entziehen.</p>
            <div className="mt-4 rounded-2xl border border-amber-500/20 bg-amber-500/8 p-4 text-sm text-amber-200">
              Standard-Admin: <strong>MahdiPilot</strong> · Passwort: <strong>MahdiPilot3</strong> · Passwort kann in <strong>/konto</strong> geändert werden.
            </div>
            <div className="mt-4 rounded-2xl border border-white/6 bg-white/4 p-4 text-sm text-slate-300">
              Normale Nutzer können Gruppen direkt auf der Startseite unter <strong>Neue Gruppe erstellen</strong> anlegen. Danach werden sie automatisch Lehrkraft dieser Gruppe und sehen den Join-Code.
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-white/8 bg-white/3 p-6">
          <h2 className="text-xl font-bold text-white">👥 Nutzerverwaltung</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500">
                  <th className="pb-2 pr-3">Benutzer</th>
                  <th className="pb-2 pr-3">Name</th>
                  <th className="pb-2 pr-3">Rolle</th>
                  <th className="pb-2 pr-3">XP</th>
                  <th className="pb-2 pr-3">🔥</th>
                  <th className="pb-2">Aktionen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {alleNutzer.map((u) => (
                  <tr key={u.id}>
                    <td className="py-3 pr-3 font-mono text-white">{u.username}</td>
                    <td className="py-3 pr-3 text-slate-300">{u.displayName}</td>
                    <td className="py-3 pr-3"><span className={`rounded px-2 py-1 text-xs font-bold ${u.platformRole === "super_admin" ? "bg-rose-500/20 text-rose-300" : "bg-white/8 text-slate-400"}`}>{u.platformRole}</span></td>
                    <td className="py-3 pr-3 text-violet-300">{u.xpTotal ?? 0}</td>
                    <td className="py-3 pr-3 text-amber-400">{u.streakCount ?? 0}</td>
                    <td className="py-3">
                      {u.id !== admin.id ? (
                        <div className="flex flex-wrap gap-2">
                          <form action="/api/admin/users" method="post">
                            <input type="hidden" name="userId" value={u.id} />
                            <input type="hidden" name="action" value={u.platformRole === "super_admin" ? "removeAdmin" : "makeAdmin"} />
                            <button type="submit" className="rounded-lg border border-white/10 px-3 py-1 text-xs text-white hover:bg-white/5">{u.platformRole === "super_admin" ? "Admin entfernen" : "Zu Admin machen"}</button>
                          </form>
                          <form action="/api/admin/users" method="post">
                            <input type="hidden" name="userId" value={u.id} />
                            <input type="hidden" name="action" value="deleteUser" />
                            <button type="submit" className="rounded-lg border border-rose-500/20 px-3 py-1 text-xs text-rose-300 hover:bg-rose-500/10">Nutzer löschen</button>
                          </form>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-500">Du selbst</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          <div className="rounded-3xl border border-white/8 bg-white/3 p-6">
            <h2 className="text-xl font-bold text-white">🏫 Gruppenverwaltung</h2>
            <div className="mt-4 space-y-3">
              {alleGruppen.map((gruppe) => (
                <div key={gruppe.id} className="flex items-center justify-between rounded-2xl border border-white/6 bg-white/4 p-4">
                  <div>
                    <p className="font-bold text-white">{gruppe.name}</p>
                    <p className="text-xs text-slate-500">{gruppe.kind}</p>
                  </div>
                  <form action="/api/admin/groups" method="post">
                    <input type="hidden" name="groupId" value={gruppe.id} />
                    <button type="submit" className="rounded-xl border border-rose-500/20 px-3 py-2 text-xs font-bold text-rose-300 hover:bg-rose-500/10">Gruppe löschen</button>
                  </form>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-white/8 bg-white/3 p-6">
            <h2 className="text-xl font-bold text-white">📚 Set-Verwaltung</h2>
            <div className="mt-4 max-h-[36rem] space-y-3 overflow-auto pr-1">
              {alleSets.map((set) => (
                <div key={set.id} className="flex items-center justify-between rounded-2xl border border-white/6 bg-white/4 p-4">
                  <div className="min-w-0">
                    <p className="truncate font-bold text-white">{set.title}</p>
                    <p className="text-xs text-slate-500">{set.visibility} · {set.status}</p>
                  </div>
                  <form action="/api/admin/collections" method="post">
                    <input type="hidden" name="collectionId" value={set.id} />
                    <button type="submit" className="rounded-xl border border-rose-500/20 px-3 py-2 text-xs font-bold text-rose-300 hover:bg-rose-500/10">Set löschen</button>
                  </form>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-white/8 bg-white/3 p-6">
          <h2 className="text-xl font-bold text-white">🎫 Support-Tickets</h2>
          <div className="mt-4 space-y-4">
            {tickets.length ? (
              tickets.map((ticket) => {
                const replies = ticketMessages.filter((message) => message.ticketId === ticket.id).slice(0, 5);
                return (
                  <div key={ticket.id} className="rounded-2xl border border-white/6 bg-white/4 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="font-bold text-white">{ticket.subject}</p>
                        <p className="text-xs text-slate-500">Status: {statusText[ticket.status]} · Priorität: {ticket.priority}</p>
                      </div>
                      <div className="flex gap-2">
                        <form action="/api/admin/tickets" method="post">
                          <input type="hidden" name="ticketId" value={ticket.id} />
                          <input type="hidden" name="action" value="resolve" />
                          <button type="submit" className="rounded-lg border border-emerald-500/20 px-3 py-1 text-xs text-emerald-300 hover:bg-emerald-500/10">Lösen</button>
                        </form>
                        <form action="/api/admin/tickets" method="post">
                          <input type="hidden" name="ticketId" value={ticket.id} />
                          <input type="hidden" name="action" value="close" />
                          <button type="submit" className="rounded-lg border border-white/10 px-3 py-1 text-xs text-white hover:bg-white/5">Schließen</button>
                        </form>
                      </div>
                    </div>
                    <p className="mt-3 text-sm text-slate-300">{ticket.message}</p>
                    {replies.length ? (
                      <div className="mt-4 space-y-2 rounded-2xl bg-black/20 p-3">
                        {replies.map((message) => (
                          <div key={message.id} className="rounded-xl border border-white/5 bg-white/5 px-3 py-2 text-sm text-slate-300">
                            <span className={`mr-2 text-xs font-bold ${message.isAdmin ? "text-rose-300" : "text-emerald-300"}`}>{message.isAdmin ? "Admin" : "Nutzer"}</span>
                            {message.message}
                          </div>
                        ))}
                      </div>
                    ) : null}
                    <form action="/api/admin/tickets" method="post" className="mt-4 space-y-3">
                      <input type="hidden" name="ticketId" value={ticket.id} />
                      <input type="hidden" name="action" value="reply" />
                      <textarea name="message" rows={3} required placeholder="Als Admin antworten" className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none" />
                      <button type="submit" className="rounded-xl bg-rose-400/90 px-4 py-2 text-sm font-bold text-slate-950 hover:bg-rose-300">Antwort senden</button>
                    </form>
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-slate-500">Noch keine Tickets vorhanden.</p>
            )}
          </div>
        </section>

        <section className="rounded-3xl border border-white/8 bg-white/3 p-6">
          <h2 className="text-xl font-bold text-white">📋 Letzte System-Events</h2>
          <div className="mt-4 space-y-2">
            {letzteEvents.map((event) => (
              <div key={event.id} className="flex justify-between rounded-xl border border-white/6 bg-white/3 px-3 py-2">
                <span className="font-mono text-sm text-emerald-300">{event.eventType}</span>
                <span className="text-xs text-slate-500">{new Date(event.createdAt).toLocaleString("de-DE")}</span>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
