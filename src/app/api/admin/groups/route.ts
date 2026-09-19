import { eq } from "drizzle-orm";
import { db } from "@/db";
import { groups, learningEvents } from "@/db/schema";
import { requireApiAdmin } from "@/lib/auth/api";
import { redirectAntwort } from "@/lib/http";

export async function POST(request: Request) {
  const auth = await requireApiAdmin(request);
  if (!auth.user) return auth.response;
  const admin = auth.user;

  const formData = await request.formData();
  const groupId = String(formData.get("groupId") ?? "");
  if (!groupId) return redirectAntwort(request, "/admin?error=ungueltige_admin_aktion");

  await db.delete(groups).where(eq(groups.id, groupId));
  await db.insert(learningEvents).values({ userId: admin.id, eventType: "admin_group_deleted", payload: { groupId } });
  return redirectAntwort(request, "/admin?saved=1");
}
