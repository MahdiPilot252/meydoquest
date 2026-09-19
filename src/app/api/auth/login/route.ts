import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { ensurePlatformSetup } from "@/lib/bootstrap";
import { verifyPassword } from "@/lib/auth/hash";
import { createSession } from "@/lib/auth/session";
import { redirectAntwort, holeClientIp } from "@/lib/http";
import { pruefeRateLimit } from "@/lib/security/rate-limit";
import { normalizeUsername } from "@/lib/utils";

export async function POST(request: Request) {
  await ensurePlatformSetup();

  const formData = await request.formData();
  const username = normalizeUsername(String(formData.get("username") ?? ""));
  const password = String(formData.get("password") ?? "");
  const clientIp = holeClientIp(request);

  const limit = pruefeRateLimit(`anmeldung:${clientIp}:${username}`, 10, 10 * 60 * 1000);
  if (!limit.erlaubt) {
    return redirectAntwort(request, "/anmelden?error=zu_viele_versuche");
  }

  if (username.length < 3 || password.length < 6) {
    return redirectAntwort(request, "/anmelden?error=ungueltige_eingaben");
  }

  const rows = await db
    .select({ id: users.id, passwordHash: users.passwordHash })
    .from(users)
    .where(eq(users.username, username))
    .limit(1);

  const user = rows[0];
  if (!user) {
    return redirectAntwort(request, "/anmelden?error=invalid_credentials");
  }

  const validPassword = await verifyPassword(password, user.passwordHash);
  if (!validPassword) {
    return redirectAntwort(request, "/anmelden?error=invalid_credentials");
  }

  await createSession(user.id);
  return redirectAntwort(request, "/");
}
