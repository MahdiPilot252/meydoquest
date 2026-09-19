import { randomBytes } from "node:crypto";

export function normalizeUsername(username: string) {
  return username.trim().toLowerCase().replace(/\s+/g, "-").slice(0, 120);
}

export function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export function createInviteCode() {
  return randomBytes(4).toString("hex").toUpperCase();
}
