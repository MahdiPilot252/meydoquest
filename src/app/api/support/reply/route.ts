import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { learningEvents, supportTicketMessages, supportTickets } from "@/db/schema";
import { sanitizeText } from "@/lib/auth/guards";
import { requireApiUser } from "@/lib/auth/api";
import { redirectAntwort } from "@/lib/http";

export async function POST(request: Request) {
  const auth = await requireApiUser(request);
  if (!auth.user) {
    return auth.response;
  }
  const user = auth.user;
  const formData = await request.formData();
  const ticketId = String(formData.get("ticketId") ?? "");
  const message = sanitizeText(String(formData.get("message") ?? ""), 4000);

  if (message.length < 2) {
    return redirectAntwort(request, "/support?error=ungueltig");
  }

  const rows = await db
    .select({ id: supportTickets.id })
    .from(supportTickets)
    .where(and(eq(supportTickets.id, ticketId), eq(supportTickets.userId, user.id)))
    .limit(1);

  if (!rows[0]) {
    return redirectAntwort(request, "/support?error=verboten");
  }

  await db.insert(supportTicketMessages).values({
    ticketId,
    userId: user.id,
    isAdmin: false,
    message,
  });

  await db
    .update(supportTickets)
    .set({ status: "open", updatedAt: new Date() })
    .where(eq(supportTickets.id, ticketId));

  await db.insert(learningEvents).values({
    userId: user.id,
    eventType: "support_ticket_reply",
    payload: { ticketId },
  });

  return redirectAntwort(request, "/support?sent=1");
}
