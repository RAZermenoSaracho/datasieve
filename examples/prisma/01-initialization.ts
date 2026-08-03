/**
 * Wiring @datasieve/prisma up: one PrismaClient, one prismaAdapter, one
 * createDataSieve() engine — reused across every model in your schema.
 */
import { PrismaClient } from "@prisma/client";
import { createDataSieve } from "@datasieve/core";
import { prismaAdapter } from "@datasieve/prisma";

const prisma = new PrismaClient();

const sieve = createDataSieve({ adapter: prismaAdapter(prisma) });

// Same engine, any model — `resource` picks which one per call.
async function example() {
  await sieve.query({ resource: prisma.user, query: {} });
}

export { prisma, sieve, example };
