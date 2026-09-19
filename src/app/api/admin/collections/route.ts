import { eq } from "drizzle-orm";
import { db } from "@/db";
import { contentCollections, learningEvents } from "@/db/schema";
import { requireApiAdmin } from "@/lib/auth/api";
import { redirectAntwort } from "@/lib/http";

export async function POST(request: Request) {
  const auth = await requireApiAdmin(request);
  if (!auth.user) return auth.response;
  const admin = auth.user;

  const formData = await request.formData();
  const collectionId = String(formData.get("collectionId") ?? "");
  if (!collectionId) return redirectAntwort(request, "/admin?error=ungueltige_admin_aktion");

  await db.delete(contentCollections).where(eq(contentCollections.id, collectionId));
  await db.insert(learningEvents).values({ userId: admin.id, eventType: "admin_collection_deleted", payload: { collectionId } });
  return redirectAntwort(request, "/admin?saved=1");
}
