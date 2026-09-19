import { getCurrentUser } from "@/lib/auth/session";
import { redirectAntwort } from "@/lib/http";

export async function requireApiUser(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return { user: null, response: redirectAntwort(request, "/anmelden") } as const;
  }

  return { user, response: null } as const;
}

export async function requireApiAdmin(request: Request) {
  const auth = await requireApiUser(request);
  if (!auth.user) {
    return auth;
  }

  if (auth.user.platformRole !== "super_admin") {
    return { user: null, response: redirectAntwort(request, "/") } as const;
  }

  return { user: auth.user, response: null } as const;
}
