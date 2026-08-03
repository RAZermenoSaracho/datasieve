import { PrismaClient } from "@prisma/client";

/** Shared Prisma client for test files — points at the same seeded SQLite db `global-setup.ts` prepared. */
export const prisma = new PrismaClient();
