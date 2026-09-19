import { eq } from "drizzle-orm";
import { db } from "@/db";
import { profiles, users } from "@/db/schema";
import { verifyPassword, hashPassword } from "@/lib/auth/hash";
import { getCurrentUser } from "@/lib/auth/session";
import { redirectAntwort, holeClientIp } from "@/lib/http";
import { pruefeRateLimit } from "@/lib/security/rate-limit";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return redirectAntwort(request, "/anmelden");

  const clientIp = holeClientIp(request);
  const limit = pruefeRateLimit(`konto:${clientIp}:${user.id}`, 20, 10 * 60 * 1000);
  if (!limit.erlaubt) return redirectAntwort(request, "/konto?error=zu_viele_versuche");

  const formData = await request.formData();
  const action = String(formData.get("action") ?? "profil");

  if (action === "profil") {
    const displayName = String(formData.get("displayName") ?? "").trim().slice(0, 120);
    const avatarDataRaw = String(formData.get("avatarData") ?? "");
    const avatarData = avatarDataRaw.startsWith("data:image/png;base64,") ? avatarDataRaw : null;

    if (displayName.length < 2) return redirectAntwort(request, "/konto?error=ungueltiges_profil");

    await db.update(users).set({ displayName, updatedAt: new Date() }).where(eq(users.id, user.id));
    
    if (avatarData) {
      await db.update(profiles).set({ avatarData, updatedAt: new Date() }).where(eq(profiles.userId, user.id));
    }

    return redirectAntwort(request, "/konto?saved=1");
  }

  if (action === "passwort") {
    const aktuellesPasswort = String(formData.get("currentPassword") ?? "");
    const neuesPasswort = String(formData.get("newPassword") ?? "");

    if (neuesPasswort.length < 6) return redirectAntwort(request, "/konto?error=ungueltiges_passwort");

    const rows = await db.select({ passwordHash: users.passwordHash }).from(users).where(eq(users.id, user.id)).limit(1);
    const gefunden = rows[0];
    if (!gefunden) return redirectAntwort(request, "/konto?error=benutzer_fehlt");

    const korrekt = await verifyPassword(aktuellesPasswort, gefunden.passwordHash);
    if (!korrekt) return redirectAntwort(request, "/konto?error=falsches_passwort");

    const passwordHash = await hashPassword(neuesPasswort);
    await db.update(users).set({ passwordHash, updatedAt: new Date() }).where(eq(users.id, user.id));

    return redirectAntwort(request, "/konto?passwordSaved=1");
  }

  return redirectAntwort(request, "/konto?error=ungueltige_aktion");
}
