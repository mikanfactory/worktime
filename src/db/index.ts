import { getPrismaClient, disconnectPrisma } from "./client";
import { runMigrations } from "./migrate";

export async function initializeDatabase(): Promise<void> {
  await runMigrations();
  const prisma = getPrismaClient();
  await prisma.$queryRawUnsafe("PRAGMA journal_mode=WAL");
  await prisma.$queryRawUnsafe("PRAGMA busy_timeout=5000");
}

export async function closeDatabase(): Promise<void> {
  await disconnectPrisma();
}
