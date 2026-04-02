import { app } from "electron";
import { drizzle, BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import * as path from "path";
import * as schema from "./schema";

export function getDbPath(): string {
  return path.join(app.getPath("userData"), "beaver_log.db");
}

let sqliteDb: Database.Database | null = null;
let drizzleDb: BetterSQLite3Database<typeof schema> | null = null;

export function getDb(): BetterSQLite3Database<typeof schema> {
  if (drizzleDb) return drizzleDb;

  const sqlite = new Database(getDbPath());

  sqliteDb = sqlite;
  drizzleDb = drizzle(sqlite, { schema });

  return drizzleDb;
}

export function getSqlite(): Database.Database {
  if (!sqliteDb) {
    getDb();
  }
  return sqliteDb!;
}

export function closeDb(): void {
  if (sqliteDb) {
    sqliteDb.close();
    sqliteDb = null;
    drizzleDb = null;
  }
}
