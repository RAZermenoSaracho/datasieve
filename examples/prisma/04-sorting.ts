/** Single and multi-key sorting. */
import { PrismaClient } from "@prisma/client";
import { createDataSieve } from "@datasieve/core";
import { prismaAdapter } from "@datasieve/prisma";
import type { DataSieveQuery } from "@datasieve/query-language";
import type { User } from "./domain.js";

const prisma = new PrismaClient();
const sieve = createDataSieve({ adapter: prismaAdapter(prisma) });

const query: DataSieveQuery<User> = {
  sort: [
    { field: "status", direction: "asc" },
    { field: "age", direction: "desc" },
  ],
};

async function example() {
  return sieve.query<User>({ resource: prisma.user, query });
}

export { example };
