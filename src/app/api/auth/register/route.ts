import { eq } from "drizzle-orm";
import { db } from "@/db";
import { platformSettings, profiles, users } from "@/db/schema";
import { ensurePlatformSetup } from "@/lib/bootstrap";
import { hashPassword } from "@/lib/auth/hash";
import { createSession } from "@/lib/auth/session";
import { redirectAntwort, holeClientIp } from "@/lib/http";
import { pruefeRateLimit } from "@/lib/security/rate-limit";
import { normalizeUsername } from "@/lib/utils";

export async function POST(request: Request) {
  await ensurePlatformSetup();

  const settingsRows = await db.select().from(platformSettings).where(eq(platformSettings.key, "global")).limit(1);
  const settings = settingsRows[0];

  if (settings && !settings.allowRegistrations) {
    return redirectAntwort(request, "/anmelden?error=registrierung_deaktiviert");
  }

  const formData = await request.formData();
  const username = normalizeUsername(String(formData.get("username") ?? ""));
  const password = String(formData.get("password") ?? "");
  const clientIp = holeClientIp(request);

  const limit = pruefeRateLimit(`registrierung:${clientIp}:${username}`, 6, 10 * 60 * 1000);
  if (!limit.erlaubt) {
    return redirectAntwort(request, "/registrieren?error=zu_viele_versuche");
  }

  if (username.length < 3 || password.length < 6) {
    return redirectAntwort(request, "/registrieren?error=invalid_input");
  }

  const existingUser = await db.select({ id: users.id }).from(users).where(eq(users.username, username)).limit(1);
  if (existingUser[0]) {
    return redirectAntwort(request, "/anmelden?error=user_exists");
  }

  const passwordHash = await hashPassword(password);
  const inserted = await db
    .insert(users)
    .values({ username, displayName: username, passwordHash })
    .returning({ id: users.id });

  await db.insert(profiles).values({ userId: inserted[0].id, preferredLanguage: "de" });
  await createSession(inserted[0].id);

  return redirectAntwort(request, "/");
}
