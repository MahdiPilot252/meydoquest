import { db } from "@/db";
import { groupAnnouncements, learningEvents } from "@/db/schema";
import { requireApiUser } from "@/lib/auth/api";
import { requireTeacherMembership, sanitizeText } from "@/lib/auth/guards";
import { redirectAntwort } from "@/lib/http";

export async function POST(request: Request) {
  const auth = await requireApiUser(request);
  if (!auth.user) return auth.response;
  const user = auth.user;

  const formData = await request.formData();
  const groupId = String(formData.get("groupId") ?? "");
  const title = sanitizeText(String(formData.get("title") ?? ""), 180);
  const message = sanitizeText(String(formData.get("message") ?? ""), 2000);

  if (!groupId || title.length < 2 || message.length < 2) {
    return redirectAntwort(request, "/?error=ungueltige_gruppe");
  }

  try {
    await requireTeacherMembership(user.id, groupId);
  } catch {
    return redirectAntwort(request, "/?error=verbotene_aufgabe");
  }

  await db.insert(groupAnnouncements).values({ groupId, createdBy: user.id, title, message });
  await db.insert(learningEvents).values({ userId: user.id, groupId, eventType: "group_announcement_created", payload: { title } });

  return redirectAntwort(request, "/?announcementCreated=1");
}
