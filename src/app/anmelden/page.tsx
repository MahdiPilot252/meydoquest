import Link from "next/link";
import { redirect } from "next/navigation";
import { getOptionalUser } from "@/lib/auth/guards";

const errorMap: Record<string, string> = {
  invalid_credentials: "Benutzername oder Passwort sind nicht korrekt.",
  user_exists: "Dieser Benutzername existiert bereits. Bitte melde dich an.",
  ungueltige_eingaben: "Bitte gib einen gültigen Benutzernamen und ein gültiges Passwort ein.",
  zu_viele_versuche: "Zu viele Versuche. Bitte warte kurz und probiere es dann erneut.",
  registrierung_deaktiviert: "Neue Registrierungen wurden vom Admin vorübergehend deaktiviert.",
};

export const dynamic = "force-dynamic";

export default async function AnmeldenPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await getOptionalUser();

  if (user) {
    redirect("/");
  }

  const params = await searchParams;
  const errorKey = typeof params.error === "string" ? params.error : "";
  const error = errorMap[errorKey];

  return (
    <main className="grid min-h-screen place-items-center px-4 py-10">
      <div className="mq-glass w-full max-w-md rounded-[2rem] p-8">
        <Link href="/" className="text-sm text-emerald-300 hover:text-emerald-200">
          ← Zurück zur Startseite
        </Link>
        <h1 className="mt-6 text-3xl font-semibold text-white">Anmelden</h1>
        <p className="mt-3 text-sm leading-7 text-slate-300">
          Melde dich an und lerne direkt weiter – ohne Umwege, ohne E-Mail, komplett auf Deutsch.
        </p>

        {error ? (
          <div className="mt-6 rounded-2xl border border-rose-400/30 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
            {error}
          </div>
        ) : null}

        <form action="/api/auth/login" method="post" className="mt-6 space-y-4">
          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-200">Benutzername</span>
            <input
              type="text"
              name="username"
              required
              className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none focus:border-emerald-400/60"
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-200">Passwort</span>
            <input
              type="password"
              name="password"
              required
              minLength={6}
              className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none focus:border-emerald-400/60"
            />
          </label>

          <button
            type="submit"
            className="inline-flex w-full items-center justify-center rounded-2xl bg-emerald-400 px-5 py-3 font-semibold text-slate-950 hover:bg-emerald-300"
          >
            Jetzt anmelden
          </button>
        </form>

        <p className="mt-6 text-sm text-slate-300">
          Noch kein Konto?{" "}
          <Link href="/registrieren" className="font-semibold text-emerald-300 hover:text-emerald-200">
            Jetzt registrieren
          </Link>
        </p>
      </div>
    </main>
  );
}
