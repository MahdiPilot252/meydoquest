import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { groupInvites, groupMemberships, learningEvents } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth/session";
import { redirectAntwort } from "@/lib/http";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return redirectAntwort(request, "/anmelden");

  const formData = await request.formData();
  const code = String(formData.get("code") ?? "").trim().toUpperCase();

  if (code.length < 4) return redirectAntwort(request, "/?error=ungueltiger_code");

  const inviteRows = await db
    .select({ id: groupInvites.id, groupId: groupInvites.groupId, role: groupInvites.role,
              expiresAt: groupInvites.expiresAt, maxUses: groupInvites.maxUses, usedCount: groupInvites.usedCount })
    .from(groupInvites).where(eq(groupInvites.code, code)).limit(1);

  const invite = inviteRows[0];
  if (!invite) return redirectAntwort(request, "/?error=code_nicht_gefunden");
  if (invite.expiresAt && invite.expiresAt <= new Date()) return redirectAntwort(request, "/?error=code_abgelaufen");
  if (invite.usedCount >= invite.maxUses) return redirectAntwort(request, "/?error=code_verbraucht");

  const existing = await db
    .select({ groupId: groupMemberships.groupId }).from(groupMemberships)
    .where(and(eq(groupMemberships.groupId, invite.groupId), eq(groupMemberships.userId, user.id))).limit(1);

  if (!existing[0]) {
    await db.insert(groupMemberships).values({ groupId: invite.groupId, userId: user.id, role: invite.role });
    await db.update(groupInvites).set({ usedCount: invite.usedCount + 1 }).where(eq(groupInvites.id, invite.id));
    await db.insert(learningEvents).values({ userId: user.id, groupId: invite.groupId, eventType: "group_joined", payload: { code } });
  }

  return redirectAntwort(request, "/?joined=1");
}
