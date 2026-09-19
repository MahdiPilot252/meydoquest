/**
 * SICHERHEITS-KERN — meydoQuest
 *
 * Alle kritischen Berechtigungsprüfungen laufen hier serverseitig.
 * Kein Client-Code darf diese Entscheidungen überschreiben.
 *
 * Schutz-Ebenen:
 * 1. Session → wer ist der Nutzer?
 * 2. platformRole → ist er Admin?
 * 3. groupMemberships → darf er auf diese Gruppe zugreifen?
 * 4. role-Check → hat er die richtige Rolle?
 */

import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { groupMemberships, groups } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth/session";

const TEACHER_ROLES = new Set(["owner", "admin", "teacher", "assistant_teacher"]);
const ADMIN_ROLES = new Set(["owner", "admin"]);

// ─── Auth Guards ─────────────────────────────────────────────────────────────

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/anmelden");
  return user;
}

export async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user) redirect("/anmelden");
  if (user.platformRole !== "super_admin") redirect("/");
  return user;
}

export async function getOptionalUser() {
  return getCurrentUser();
}

// ─── Rollen-Checks ───────────────────────────────────────────────────────────

export function isTeacherLike(role: string) {
  return TEACHER_ROLES.has(role);
}

export function isAdminLike(role: string) {
  return ADMIN_ROLES.has(role);
}

// ─── Gruppen-Berechtigungen ──────────────────────────────────────────────────

/**
 * Wirft FORBIDDEN wenn der User kein Lehrer in dieser Gruppe ist.
 * Verhindert IDOR: Schüler können keine Aufgaben für fremde Gruppen erstellen.
 */
export async function requireTeacherMembership(userId: string, groupId: string) {
  // UUID-Format validieren — verhindert SQL-Injection durch ungültige IDs
  if (!isValidUuid(groupId) || !isValidUuid(userId)) throw new Error("FORBIDDEN");

  const rows = await db
    .select({ role: groupMemberships.role })
    .from(groupMemberships)
    .where(and(eq(groupMemberships.userId, userId), eq(groupMemberships.groupId, groupId)))
    .limit(1);

  const membership = rows[0];
  if (!membership || !TEACHER_ROLES.has(membership.role)) throw new Error("FORBIDDEN");
  return membership;
}

/**
 * Prüft ob User Mitglied einer Gruppe ist.
 * Verhindert: Fremde können keine privaten Gruppeninhalte lesen.
 */
export async function requireGroupMembership(userId: string, groupId: string) {
  if (!isValidUuid(groupId) || !isValidUuid(userId)) throw new Error("FORBIDDEN");

  const rows = await db
    .select({ groupId: groupMemberships.groupId, role: groupMemberships.role, groupName: groups.name })
    .from(groupMemberships)
    .innerJoin(groups, eq(groupMemberships.groupId, groups.id))
    .where(and(eq(groupMemberships.userId, userId), eq(groupMemberships.groupId, groupId)))
    .limit(1);

  const membership = rows[0];
  if (!membership) throw new Error("FORBIDDEN");
  return membership;
}

// ─── Eingabe-Validierung ──────────────────────────────────────────────────────

export function isValidUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

export function sanitizeText(value: string, maxLength = 200) {
  return value.trim().slice(0, maxLength);
}
