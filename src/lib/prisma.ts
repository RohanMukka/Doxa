import path from "node:path";
import { PrismaClient } from "@/generated/prisma/client";

// Bundlers (Turbopack/webpack) rewrite the generated client's module location,
// which breaks its import.meta.url-based resolution of relative sqlite paths.
// Resolve the db file to an absolute path ourselves instead of trusting the
// relative DATABASE_URL in .env.
const dbPath = path.join(process.cwd(), "prisma", "dev.db");

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ?? new PrismaClient({ datasourceUrl: `file:${dbPath}` });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
