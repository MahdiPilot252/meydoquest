import { clearSession } from "@/lib/auth/session";
import { redirectAntwort } from "@/lib/http";

export async function POST(request: Request) {
  await clearSession();
  return redirectAntwort(request, "/");
}
