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
  const subject = sanitizeText(String(formData.get("subject") ?? ""), 180);
  const message = sanitizeText(String(formData.get("message") ?? ""), 4000);
  const priority = String(formData.get("priority") ?? "normal");

  if (subject.length < 3 || message.length < 5) {
    return redirectAntwort(request, "/support?error=ungueltig");
  }

  const inserted = await db
    .insert(supportTickets)
    .values({
      userId: user.id,
      subject,
      message,
      priority: priority === "low" || priority === "high" || priority === "urgent" ? priority : "normal",
      status: "open",
      updatedAt: new Date(),
    })
    .returning({ id: supportTickets.id });

  await db.insert(supportTicketMessages).values({
    ticketId: inserted[0].id,
    userId: user.id,
    isAdmin: false,
    message,
  });

  await db.insert(learningEvents).values({
    userId: user.id,
    eventType: "support_ticket_created",
    payload: { ticketId: inserted[0].id, subject },
  });

  return redirectAntwort(request, "/support?sent=1");
}
