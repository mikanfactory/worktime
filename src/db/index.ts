import { getSqlite, closeDb } from "./client";
import { runMigrations } from "./migrate";

export async function initializeDatabase(): Promise<void> {
  await runMigrations();
  const sqlite = getSqlite();
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("busy_timeout = 5000");
  sqlite.pragma("foreign_keys = ON");
}

export async function closeDatabase(): Promise<void> {
  closeDb();
}
