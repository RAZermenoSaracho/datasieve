import { createDataSieve } from "@razsdev/datasieve-core";
import { ParseError, QueryValidationError, type DataSieveQuery } from "@razsdev/datasieve-query-language";
import { describe, expect, test } from "vitest";
import { prismaAdapter } from "../src/adapter.js";
import { prisma } from "./client.js";
import type { User } from "./fixtures.js";

describe("createDataSieve + prismaAdapter — end to end", () => {
  test("filters, sorts, paginates, and selects through the full pipeline", async () => {
    const engine = createDataSieve({ adapter: prismaAdapter(prisma), defaultPageSize: 2 });

    const response = await engine.query<User>({
      resource: prisma.user,
      query: {
        where: { field: "status", op: "=", value: "ACTIVE" },
        sort: [{ field: "age", direction: "asc" }],
        select: { id: true, name: true },
      },
    });

    expect(response.data).toEqual([
      { id: "user-linus", name: "Linus Torvalds" },
      { id: "user-ada", name: "Ada Lovelace" },
    ]);
    expect(response.meta).toMatchObject({
      total: 3,
      page: 1,
      pageSize: 2,
      pageCount: 2,
      hasNext: true,
      hasPrevious: false,
    });
  });

  test("a beforeNormalize plugin can inject a soft-delete filter", async () => {
    const excludeDeleted = {
      name: "soft-delete",
      beforeNormalize<T>(query: DataSieveQuery<T>) {
        return {
          ...query,
          where: query.where
            ? { and: [query.where, { field: "deletedAt", op: "isNull" }] }
            : { field: "deletedAt", op: "isNull" },
        } as DataSieveQuery<T>;
      },
    };
    const engine = createDataSieve({ adapter: prismaAdapter(prisma), plugins: [excludeDeleted] });

    const response = await engine.query<User>({
      resource: prisma.user,
      query: { where: { field: "status", op: "=", value: "ACTIVE" } },
    });

    // Linus is ACTIVE but soft-deleted (deletedAt set), so he should be excluded.
    expect((response.data as { id: string }[]).map((u) => u.id).sort()).toEqual(["user-ada", "user-margaret"]);
  });

  test("propagates parse/validation errors without ever reaching Prisma", async () => {
    const engine = createDataSieve({ adapter: prismaAdapter(prisma) });

    await expect(engine.query<User>({ resource: prisma.user, query: "not a query" })).rejects.toBeInstanceOf(
      ParseError,
    );
    await expect(
      engine.query<User>({ resource: prisma.user, query: { where: { and: [] } } }),
    ).rejects.toBeInstanceOf(QueryValidationError);
  });
});
