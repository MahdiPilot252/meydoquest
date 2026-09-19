# meydoQuest File Manifest

| path | purpose | status | dependencies | last modification |
| --- | --- | --- | --- | --- |
| docs/meydoquest-architecture.md | Research, product definition, ADRs, domain, security, roadmap | created | none | Architekturgrundlage dokumentiert |
| docs/file-manifest.md | Projektmanifest | modified | none | auf Branding/Support/Admin erweitert |
| src/db/schema.ts | Drizzle-Schema für Auth, Lernen, Gruppen, Aufgaben, Branding, Support, Admin | modified | drizzle-orm/pg-core | platform_settings + support tables ergänzt |
| src/db/index.ts | PostgreSQL-Pool und Drizzle-Client | verified | pg, drizzle-orm | unverändert wiederverwendet |
| src/app/layout.tsx | globales Layout und dynamische Plattform-Metadaten | modified | globals.css, bootstrap, platform data | dynamisches Logo/Title/Favicon ergänzt |
| src/app/globals.css | Theme, Glassmorphism, Fokuszustände | modified | Tailwind | aktiv |
| src/app/page.tsx | eine zentrale deutschsprachige Hauptseite mit Vokabel-Fokus | modified | auth, bootstrap, dashboard data, platform data | Branding + Support-Link + Gruppenfluss integriert |
| src/app/dashboard/page.tsx | Altpfad leitet auf Hauptseite um | modified | next/navigation | vereinfacht |
| src/app/anmelden/page.tsx | deutsche Anmeldeseite | created | auth route | Registrierungssperre-Meldung ergänzt |
| src/app/registrieren/page.tsx | deutsche Registrierungsseite | created | auth route | implementiert |
| src/app/login/page.tsx | Legacy-Weiterleitung auf /anmelden | modified | next/navigation | implementiert |
| src/app/register/page.tsx | Legacy-Weiterleitung auf /registrieren | modified | next/navigation | implementiert |
| src/app/konto/page.tsx | Profil, Avatar/Skin und Passwort-Verwaltung | modified | auth, db | vereinfachte Kontoverwaltung |
| src/app/support/page.tsx | User-Support mit Tickets und Antworten | created | auth, db, platform data | implementiert |
| src/app/admin/page.tsx | Admin-Control-Center für Branding, Nutzer, Gruppen, Sets, Tickets | modified | auth, db | umfassend erweitert |
| src/app/lernen/[sessionId]/page.tsx | deutsche Lernansicht | created | auth, db, StudySessionForm | implementiert |
| src/app/study/[sessionId]/page.tsx | Legacy-Weiterleitung auf /lernen | modified | next/navigation | implementiert |
| src/app/api/health/route.ts | Healthcheck | verified | db | unverändert |
| src/app/api/auth/register/route.ts | Registrierung mit Benutzername + Passwort | modified | db, hash, session, rate-limit, platform settings | Registrierung per Flag steuerbar |
| src/app/api/auth/login/route.ts | Anmeldung mit Benutzername + Passwort | modified | db, hash, session, rate-limit | implementiert |
| src/app/api/auth/logout/route.ts | Abmeldung | modified | session, http redirect helper | implementiert |
| src/app/api/konto/route.ts | Profil-/Skin-/Passwort-Update | created | db, hash, auth, rate-limit | implementiert |
| src/app/api/groups/route.ts | Gruppen erstellen + Join-Code | modified | db, auth, http helper | normale Nutzer werden Lehrkraft ihrer Gruppe |
| src/app/api/groups/join/route.ts | Gruppenbeitritt per Code | modified | db, auth, http helper | implementiert |
| src/app/api/assignments/route.ts | Aufgaben veröffentlichen | modified | db, auth guards, http helper | implementiert |
| src/app/api/collections/route.ts | eigene Vokabelsets und Übungen erstellen | modified | db, auth, http helper | implementiert |
| src/app/api/sessions/route.ts | Lernrunde starten | modified | db, auth, http helper | implementiert |
| src/app/api/sessions/[sessionId]/answer/route.ts | Antwortabgabe mit Validierung, SRS, Mastery, Rewards | modified | db, validators, scheduler, mastery, rewards | implementiert |
| src/app/api/support/route.ts | Support-Ticket erstellen | created | db, api auth, http helper | implementiert |
| src/app/api/support/reply/route.ts | Nutzerantwort auf Support-Ticket | created | db, api auth, http helper | implementiert |
| src/app/api/admin/route.ts | Admin-JSON-Übersicht | modified | db, api admin auth | abgesichert |
| src/app/api/admin/branding/route.ts | Website-Branding, Logo-Upload, Flags | created | db, fs, api admin auth | implementiert |
| src/app/api/admin/users/route.ts | Admin-Nutzeraktionen | created | db, api admin auth | Rollen ändern/löschen |
| src/app/api/admin/groups/route.ts | Admin-Gruppenlöschung | created | db, api admin auth | implementiert |
| src/app/api/admin/collections/route.ts | Admin-Setlöschung | created | db, api admin auth | implementiert |
| src/app/api/admin/tickets/route.ts | Admin-Antworten und Ticket-Status | created | db, api admin auth | implementiert |
| src/components/study-session-form.tsx | deutsche Eingabeform für Übungstypen | modified | React | implementiert |
| src/lib/bootstrap.ts | idempotentes Setup und deutsche Starterdaten | modified | db, auth hash, rewards, platform settings | MahdiPilot + globale Settings |
| src/lib/utils.ts | Benutzernamen-Normalisierung, Slugs, Join-Codes | modified | node:crypto | implementiert |
| src/lib/http.ts | sichere Redirect-Helfer | modified | next/server | korrekte öffentliche Redirects |
| src/lib/security/rate-limit.ts | einfaches serverseitiges Rate-Limiting | created | global memory | implementiert |
| src/lib/auth/hash.ts | Passwort-Hashing | created | node:crypto | implementiert |
| src/lib/auth/session.ts | Cookie-Session-Verwaltung | created | db, next/headers | implementiert |
| src/lib/auth/guards.ts | Seiten-Auth, Rollen, UUID-/Text-Validierung | modified | db, session | gehärtet |
| src/lib/auth/api.ts | API-Auth und API-Admin-Guards | created | session, http helper | implementiert |
| src/lib/learning/validators.ts | Antwort-Validatoren | created | none | implementiert |
| src/lib/learning/scheduler.ts | DSR-inspirierte Wiederholungslogik | created | none | implementiert |
| src/lib/learning/mastery.ts | Mastery-Berechnung | created | schema enum types | implementiert |
| src/lib/learning/rewards.ts | XP/Münzen/Achievements | modified | none | deutschsprachig implementiert |
| src/lib/data/dashboard.ts | Datenabfragen für Startseite und Übersicht | created | db, schema | implementiert |
| src/lib/data/platform.ts | globale Plattform-Einstellungen laden | created | db, schema | implementiert |
| next.config.ts | Sicherheits-Header | modified | Next.js | implementiert |
