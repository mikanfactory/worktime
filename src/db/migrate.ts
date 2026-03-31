import Database from "better-sqlite3";
import * as fs from "fs";
import * as path from "path";
import { getDbPath } from "./client";

interface PrismaMigrationRow {
  migration_name: string;
}

export async function runMigrations(): Promise<void> {
  const sqlite = new Database(getDbPath());

  try {
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS _prisma_migrations (
        id TEXT PRIMARY KEY,
        checksum TEXT NOT NULL,
        finished_at TEXT,
        migration_name TEXT NOT NULL,
        logs TEXT,
        rolled_back_at TEXT,
        started_at TEXT NOT NULL DEFAULT (datetime('now')),
        applied_steps_count INTEGER NOT NULL DEFAULT 0
      )
    `);

    const resolvedDir = resolveMigrationsDir();
    if (!resolvedDir) {
      console.warn("No migrations directory found, skipping migrations");
      return;
    }

    const migrationDirs = fs
      .readdirSync(resolvedDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .sort((a, b) => a.name.localeCompare(b.name));

    const appliedRows = sqlite
      .prepare("SELECT migration_name FROM _prisma_migrations")
      .all() as PrismaMigrationRow[];
    const appliedNames = new Set(appliedRows.map((row) => row.migration_name));

    for (const dir of migrationDirs) {
      if (appliedNames.has(dir.name)) continue;

      const sqlPath = path.join(resolvedDir, dir.name, "migration.sql");
      if (!fs.existsSync(sqlPath)) continue;

      const sql = fs.readFileSync(sqlPath, "utf-8");
      const id = generateMigrationId();
      const checksum = simpleHash(sql);

      const statements = sql
        .split(";")
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      for (const statement of statements) {
        sqlite.exec(statement);
      }

      sqlite
        .prepare(
          `INSERT INTO _prisma_migrations (id, checksum, finished_at, migration_name, applied_steps_count)
         VALUES (?, ?, datetime('now'), ?, 1)`,
        )
        .run(id, checksum, dir.name);

      console.log(`Applied migration: ${dir.name}`);
    }
  } finally {
    sqlite.close();
  }
}

function resolveMigrationsDir(): string | null {
  const possibleDirs = [
    // Production: extraResources copies to resources/migrations
    path.join(process.resourcesPath, "migrations"),
    // Dev mode: source directory
    path.join(__dirname, "..", "..", "src", "db", "migrations"),
    path.join(__dirname, "migrations"),
    path.join(__dirname, "..", "db", "migrations"),
  ];

  for (const dir of possibleDirs) {
    if (fs.existsSync(dir)) {
      return dir;
    }
  }
  return null;
}

function generateMigrationId(): string {
  const chars = "abcdef0123456789";
  const segments = [8, 4, 4, 4, 12];
  return segments
    .map((len) =>
      Array.from(
        { length: len },
        () => chars[Math.floor(Math.random() * chars.length)],
      ).join(""),
    )
    .join("-");
}

function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(16).padStart(16, "0");
}
