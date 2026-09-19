import { NextResponse } from "next/server";

/**
 * Erstellt einen sicheren Redirect zurück zur selben Domain.
 * Wir bauen die absolute URL aus dem Origin-Header des Requests,
 * damit weder localhost noch interne Proxy-Adressen nach außen gelangen.
 */
export function redirectAntwort(request: Request, pfad: string, status = 303) {
  // Origin aus dem Request-Header lesen (z. B. https://3000-xxx.e2b.app)
  const origin = request.headers.get("origin");

  // Alternativ: Host-Header verwenden und das Protokoll aus x-forwarded-proto holen
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || "localhost:3000";
  const proto = request.headers.get("x-forwarded-proto") || "https";

  const basis = origin || `${proto}://${host}`;

  // Sicherstellen dass pfad mit / anfängt
  const sauberPfad = pfad.startsWith("/") ? pfad : `/${pfad}`;

  const ziel = `${basis}${sauberPfad}`;

  return NextResponse.redirect(ziel, {
    status,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

export function holeClientIp(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || "unbekannt";
  }

  return request.headers.get("x-real-ip") || "unbekannt";
}
