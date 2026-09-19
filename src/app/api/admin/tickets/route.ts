import { eq } from "drizzle-orm";
import { db } from "@/db";
import { learningEvents, supportTicketMessages, supportTickets } from "@/db/schema";
import { requireApiAdmin } from "@/lib/auth/api";
import { sanitizeText } from "@/lib/auth/guards";
import { redirectAntwort } from "@/lib/http";

export async function POST(request: Request) {
  const auth = await requireApiAdmin(request);
  if (!auth.user) return auth.response;
  const admin = auth.user;

  const formData = await request.formData();
  const action = String(formData.get("action") ?? "reply");
  const ticketId = String(formData.get("ticketId") ?? "");
  if (!ticketId) return redirectAntwort(request, "/admin?error=ungueltige_admin_aktion");

  if (action === "reply") {
    const message = sanitizeText(String(formData.get("message") ?? ""), 4000);
    if (message.length < 2) return redirectAntwort(request, "/admin?error=ungueltige_admin_aktion");
    await db.insert(supportTicketMessages).values({ ticketId, userId: admin.id, isAdmin: true, message });
    await db.update(supportTickets).set({ status: "in_progress", updatedAt: new Date() }).where(eq(supportTickets.id, ticketId));
  } else if (action === "resolve") {
    await db.update(supportTickets).set({ status: "resolved", updatedAt: new Date() }).where(eq(supportTickets.id, ticketId));
  } else if (action === "close") {
    await db.update(supportTickets).set({ status: "closed", updatedAt: new Date() }).where(eq(supportTickets.id, ticketId));
  } else if (action === "reopen") {
    await db.update(supportTickets).set({ status: "open", updatedAt: new Date() }).where(eq(supportTickets.id, ticketId));
  } else {
    return redirectAntwort(request, "/admin?error=ungueltige_admin_aktion");
  }

  await db.insert(learningEvents).values({ userId: admin.id, eventType: "admin_ticket_action", payload: { action, ticketId } });
  return redirectAntwort(request, "/admin?saved=1");
}
