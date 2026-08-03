/**
 * Offset and cursor pagination through the same `pagination` field —
 * switching strategy doesn't change the response contract.
 */
import { PrismaClient } from "@prisma/client";
import { createDataSieve } from "@razsdev/datasieve-core";
import { prismaAdapter } from "@razsdev/datasieve-prisma";
import type { DataSieveQuery } from "@razsdev/datasieve-query-language";
import type { User } from "./domain.js";

const prisma = new PrismaClient();
const sieve = createDataSieve({ adapter: prismaAdapter(prisma) });

const offsetQuery: DataSieveQuery<User> = {
  sort: [{ field: "createdAt", direction: "desc" }],
  pagination: { kind: "offset", page: 2, pageSize: 20 },
};

const firstCursorPage: DataSieveQuery<User> = {
  sort: [{ field: "createdAt", direction: "desc" }],
  pagination: { kind: "cursor", take: 20 },
};

async function example() {
  const page2 = await sieve.query<User>({ resource: prisma.user, query: offsetQuery });

  const first = await sieve.query<User>({ resource: prisma.user, query: firstCursorPage });
  const nextCursor = first.meta.cursor?.next;
  const second = nextCursor
    ? await sieve.query<User>({
        resource: prisma.user,
        query: { ...firstCursorPage, pagination: { kind: "cursor", take: 20, cursor: nextCursor } },
      })
    : null;

  return { page2, first, second };
}

export { example };
