/**
 * A basic query: filter + select, run through the full pipeline
 * (parse -> validate -> normalize -> Prisma -> standardized response).
 */
import { PrismaClient } from "@prisma/client";
import { createDataSieve } from "@razsdev/datasieve-core";
import { prismaAdapter } from "@razsdev/datasieve-prisma";
import type { DataSieveQuery } from "@razsdev/datasieve-query-language";
import type { User } from "./domain.js";

const prisma = new PrismaClient();
const sieve = createDataSieve({ adapter: prismaAdapter(prisma) });

const query: DataSieveQuery<User> = {
  where: { field: "status", op: "=", value: "ACTIVE" },
  select: { id: true, name: true, email: true },
};

async function example() {
  const response = await sieve.query<User>({ resource: prisma.user, query });
  // response.data -> Pick<User, "id" | "name" | "email">[]
  // response.meta -> { total, page, pageSize, pageCount, hasNext, hasPrevious, cursor, executionTime }
  return response;
}

export { example };
