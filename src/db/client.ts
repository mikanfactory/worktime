import { app } from "electron";
import { PrismaClient } from "@prisma/client";
import * as path from "path";

let prismaClient: PrismaClient | null = null;

export function getPrismaClient(): PrismaClient {
  if (prismaClient) return prismaClient;

  const dbPath = path.join(app.getPath("userData"), "beaver_log.db");

  prismaClient = new PrismaClient({
    datasources: {
      db: {
        url: `file:${dbPath}`,
      },
    },
  });

  return prismaClient;
}

export async function disconnectPrisma(): Promise<void> {
  if (prismaClient) {
    await prismaClient.$disconnect();
    prismaClient = null;
  }
}
