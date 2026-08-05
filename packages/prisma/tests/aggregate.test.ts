import { createDataSieve } from "@razsdev/datasieve-core";
import { normalizeQuery, type DataSieveQuery } from "@razsdev/datasieve-query-language";
import { describe, expect, test } from "vitest";
import { prismaAdapter } from "../src/adapter.js";
import { prisma } from "./client.js";
import type { Order } from "./fixtures.js";

const adapter = prismaAdapter(prisma);

function run(query: DataSieveQuery<Order>) {
  return adapter.execute(normalizeQuery(query), prisma.order);
}

describe("prismaAdapter — grouping/aggregation", () => {
  test("groups by a field and computes count/sum, reshaped to the requested aliases", async () => {
    const result = await run({
      groupBy: { fields: ["status"] },
      aggregations: [
        { fn: "count", alias: "orderCount" },
        { fn: "sum", field: "total", alias: "revenue" },
      ],
      sort: [{ field: "status", direction: "asc" }],
    });

    expect(result.data).toEqual([
      { status: "CANCELLED", orderCount: 1, revenue: 75 },
      { status: "PAID", orderCount: 3, revenue: 900 },
      { status: "PENDING", orderCount: 1, revenue: 250 },
    ]);
  });

  test("having filters the grouped results", async () => {
    const result = await run({
      groupBy: { fields: ["status"], having: { field: "status", op: "!=", value: "CANCELLED" } },
      aggregations: [{ fn: "count", alias: "orderCount" }],
      sort: [{ field: "status", direction: "asc" }],
    });

    expect(result.data).toEqual([
      { status: "PAID", orderCount: 3 },
      { status: "PENDING", orderCount: 1 },
    ]);
  });

  test("rejects cursor pagination for grouped queries with a clear error", async () => {
    await expect(
      run({ groupBy: { fields: ["status"] }, pagination: { kind: "cursor", take: 2 } }),
    ).rejects.toThrow(/cursor pagination for grouped/);
  });

  test("succeeds when the engine applies a default offset pagination and no sort was requested", async () => {
    // Regression test: createDataSieve() applies `defaultPageSize` to every
    // query that omits `pagination`, including grouped/aggregated ones. That
    // used to reach Prisma's groupBy as bare `skip`/`take` with no `orderBy`,
    // which Prisma rejects ("Missing fields: id") since it requires orderBy
    // whenever skip/take is used on groupBy, and defaults it to the primary
    // key when none is given.
    const engine = createDataSieve({ adapter: prismaAdapter(prisma), defaultPageSize: 500 });

    const result = await engine.query<Order>({
      resource: prisma.order,
      query: {
        groupBy: { fields: ["status"] },
        aggregations: [{ fn: "sum", field: "total", alias: "revenue" }],
      },
    });

    expect(result.data).toEqual(
      expect.arrayContaining([expect.objectContaining({ status: "PAID", revenue: 900 })]),
    );
  });
});
