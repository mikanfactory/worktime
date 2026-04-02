import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import Database from "better-sqlite3";
import * as fs from "fs";
import * as path from "path";
import { getDbPath } from "./client";

export async function runMigrations(): Promise<void> {
  const sqlite = new Database(getDbPath());

  try {
    const db = drizzle(sqlite);
    const migrationsFolder = resolveMigrationsDir();

    if (!migrationsFolder) {
      console.warn("No migrations directory found, skipping migrations");
      return;
    }

    migrate(db, { migrationsFolder });

    // Clean up legacy Prisma migration table if it exists
    const hasPrismaTable = sqlite
      .prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='_prisma_migrations'",
      )
      .get();

    if (hasPrismaTable) {
      sqlite.exec("DROP TABLE _prisma_migrations");
      console.log("Dropped legacy _prisma_migrations table");
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
