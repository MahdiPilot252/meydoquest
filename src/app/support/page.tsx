import Link from "next/link";
import { asc, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { supportTicketMessages, supportTickets } from "@/db/schema";
import { requireUser } from "@/lib/auth/guards";
import { getPlatformSettings } from "@/lib/data/platform";

export const dynamic = "force-dynamic";

const statusText: Record<string, string> = {
  open: "Offen",
  in_progress: "In Bearbeitung",
  resolved: "Gelöst",
  closed: "Geschlossen",
};

const priorityText: Record<string, string> = {
  low: "Niedrig",
  normal: "Normal",
  high: "Hoch",
  urgent: "Dringend",
};

const errorText: Record<string, string> = {
  ungueltig: "Bitte fülle das Ticket vollständig aus.",
  verboten: "Du darfst dieses Ticket nicht bearbeiten.",
};

export default async function SupportPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  const settings = await getPlatformSettings();
  const params = await searchParams;

  const tickets = await db
    .select()
    .from(supportTickets)
    .where(eq(supportTickets.userId, user.id))
    .orderBy(desc(supportTickets.updatedAt), desc(supportTickets.createdAt));

  const messages = tickets.length
    ? await db
        .select()
        .from(supportTicketMessages)
        .where(inArray(supportTicketMessages.ticketId, tickets.map((ticket) => ticket.id)))
        .orderBy(asc(supportTicketMessages.createdAt))
    : [];

  const errorKey = typeof params.error === "string" ? params.error : "";

  return (
    <div className="min-h-screen bg-[#090d16]">
      <nav className="flex items-center justify-between border-b border-white/6 px-4 py-3 sm:px-6">
        <Link href="/" className="text-sm font-semibold text-emerald-400 hover:text-emerald-300">← Zurück</Link>
        <span className="text-sm text-slate-400">Support</span>
      </nav>

      <main className="mx-auto max-w-3xl space-y-6 px-4 py-8">
        <section className="rounded-3xl border border-white/8 bg-white/3 p-6">
          <h1 className="text-2xl font-bold text-white">Hilfe & Support</h1>
          <p className="mt-2 text-sm text-slate-400">{settings.supportInfo ?? "Schreibe ein Ticket, wenn du Hilfe brauchst."}</p>
          {settings.supportEmail ? <p className="mt-1 text-sm text-emerald-300">Kontakt: {settings.supportEmail}</p> : null}
        </section>

        {params.sent === "1" ? <div className="rounded-2xl bg-emerald-500/10 px-4 py-3 text-sm font-bold text-emerald-300">Nachricht gesendet.</div> : null}
        {errorText[errorKey] ? <div className="rounded-2xl bg-rose-500/10 px-4 py-3 text-sm font-bold text-rose-300">{errorText[errorKey]}</div> : null}

        <section className="rounded-3xl border border-white/8 bg-white/3 p-6">
          <h2 className="text-lg font-bold text-white">Neues Ticket</h2>
          <form action="/api/support" method="post" className="mt-4 space-y-3">
            <input type="text" name="subject" required placeholder="Betreff" className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-slate-500" />
            <select name="priority" defaultValue="normal" className="w-full rounded-2xl border border-white/10 bg-[#0f1524] px-4 py-3 text-white outline-none">
              <option value="low">Niedrig</option>
              <option value="normal">Normal</option>
              <option value="high">Hoch</option>
              <option value="urgent">Dringend</option>
            </select>
            <textarea name="message" required rows={6} placeholder="Beschreibe dein Problem" className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-slate-500" />
            <button type="submit" className="w-full rounded-2xl bg-emerald-400 py-3 font-bold text-slate-950 hover:bg-emerald-300">Ticket senden</button>
          </form>
        </section>

        <section className="rounded-3xl border border-white/8 bg-white/3 p-6">
          <h2 className="text-lg font-bold text-white">Meine Tickets</h2>
          <div className="mt-4 space-y-4">
            {tickets.length ? (
              tickets.map((ticket) => {
                const ticketReplies = messages.filter((message) => message.ticketId === ticket.id);
                return (
                  <div key={ticket.id} className="rounded-2xl border border-white/6 bg-white/4 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-bold text-white">{ticket.subject}</p>
                      <div className="flex gap-2 text-xs">
                        <span className="rounded-full bg-white/10 px-2 py-1 text-slate-300">{statusText[ticket.status]}</span>
                        <span className="rounded-full bg-white/10 px-2 py-1 text-slate-300">{priorityText[ticket.priority]}</span>
                      </div>
                    </div>
                    <p className="mt-2 text-sm text-slate-400">{ticket.message}</p>
                    {ticketReplies.length ? (
                      <div className="mt-4 space-y-2 rounded-2xl bg-black/20 p-3">
                        {ticketReplies.map((message) => (
                          <div key={message.id} className="rounded-xl border border-white/5 bg-white/5 px-3 py-2 text-sm text-slate-300">
                            <span className={`mr-2 text-xs font-bold ${message.isAdmin ? "text-rose-300" : "text-emerald-300"}`}>{message.isAdmin ? "Admin" : "Du"}</span>
                            {message.message}
                          </div>
                        ))}
                      </div>
                    ) : null}
                    {ticket.status !== "closed" ? (
                      <form action="/api/support/reply" method="post" className="mt-4 space-y-3">
                        <input type="hidden" name="ticketId" value={ticket.id} />
                        <textarea name="message" rows={3} required placeholder="Antwort hinzufügen" className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-slate-500" />
                        <button type="submit" className="rounded-xl border border-white/10 px-4 py-2 font-semibold text-white hover:bg-white/5">Antwort senden</button>
                      </form>
                    ) : null}
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-slate-500">Noch keine Tickets vorhanden.</p>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
