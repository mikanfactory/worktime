import { getPrismaClient, disconnectPrisma } from "./client";
import { runMigrations } from "./migrate";

export async function initializeDatabase(): Promise<void> {
  await runMigrations();
  const prisma = getPrismaClient();
  await prisma.$executeRawUnsafe("PRAGMA journal_mode=WAL");
  await prisma.$executeRawUnsafe("PRAGMA busy_timeout=5000");
}

export async function closeDatabase(): Promise<void> {
  await disconnectPrisma();
}
