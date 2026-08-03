/**
 * Nested and/or/not filtering, translated into Prisma's AND/OR/NOT.
 *
 * Note: filtering through a *to-many* relation (e.g. an order total on a
 * user's orders) isn't specially handled by this adapter yet — see the
 * package README's "Known limitations" section.
 */
import { PrismaClient } from "@prisma/client";
import { createDataSieve } from "@datasieve/core";
import { prismaAdapter } from "@datasieve/prisma";
import type { DataSieveQuery } from "@datasieve/query-language";
import type { User } from "./domain.js";

const prisma = new PrismaClient();
const sieve = createDataSieve({ adapter: prismaAdapter(prisma) });

const query: DataSieveQuery<User> = {
  where: {
    and: [
      { field: "status", op: "=", value: "ACTIVE" },
      { field: "age", op: ">=", value: 18 },
      { not: { field: "deletedAt", op: "isNotNull" } },
    ],
  },
};

async function example() {
  return sieve.query<User>({ resource: prisma.user, query });
}

export { example };
