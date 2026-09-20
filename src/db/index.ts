import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

// Dein bombensicherer, neuer IPv4-Link direkt im Code verankert!
const databaseUrl = process.env.DATABASE_URL || "postgresql://postgres.josodbxaherxjqeejcfm:Mehdiolingwow@://supabase.com";

const globalForDb = globalThis as typeof globalThis & {
  __arenaNextJsPostgresqlPool?: Pool;
};

export const pool =
  globalForDb.__arenaNextJsPostgresqlPool ??
  new Pool({
    connectionString: databaseUrl,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.__arenaNextJsPostgresqlPool = pool;
}

export const db = drizzle(pool);
