import { eq } from "drizzle-orm";
import { db } from "@/db";
import { learningEvents, users } from "@/db/schema";
import { requireApiAdmin } from "@/lib/auth/api";
import { redirectAntwort } from "@/lib/http";

export async function POST(request: Request) {
  const auth = await requireApiAdmin(request);
  if (!auth.user) return auth.response;
  const admin = auth.user;

  const formData = await request.formData();
  const action = String(formData.get("action") ?? "");
  const userId = String(formData.get("userId") ?? "");

  if (!userId || userId === admin.id) return redirectAntwort(request, "/admin?error=ungueltiger_admin_eingriff");

  if (action === "makeAdmin") {
    await db.update(users).set({ platformRole: "super_admin", updatedAt: new Date() }).where(eq(users.id, userId));
  } else if (action === "removeAdmin") {
    await db.update(users).set({ platformRole: "user", updatedAt: new Date() }).where(eq(users.id, userId));
  } else if (action === "deleteUser") {
    await db.delete(users).where(eq(users.id, userId));
  } else {
    return redirectAntwort(request, "/admin?error=ungueltige_admin_aktion");
  }

  await db.insert(learningEvents).values({ userId: admin.id, eventType: "admin_user_action", payload: { action, userId } });
  return redirectAntwort(request, "/admin?saved=1");
}
