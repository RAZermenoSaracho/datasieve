import { normalizeQuery, type DataSieveQuery } from "@datasieve/query-language";
import { describe, expect, test } from "vitest";
import { prismaAdapter } from "../src/adapter.js";
import { prisma } from "./client.js";
import type { User } from "./fixtures.js";

const adapter = prismaAdapter(prisma);

function run(query: DataSieveQuery<User>) {
  return adapter.execute(normalizeQuery(query), prisma.user);
}

describe("prismaAdapter — select/include", () => {
  test("select projects only the requested scalar fields", async () => {
    const result = await run({ where: { field: "id", op: "=", value: "user-ada" }, select: { id: true, name: true } });
    expect(result.data).toEqual([{ id: "user-ada", name: "Ada Lovelace" }]);
  });

  test("include eager-loads a relation", async () => {
    const result = await run({ where: { field: "id", op: "=", value: "user-ada" }, include: { profile: true } });
    const [row] = result.data as { profile: { region: string } | null }[];
    expect(row?.profile?.region).toBe("west");
  });

  test("include with a scoped nested query (where/select/sort)", async () => {
    const result = await run({
      where: { field: "id", op: "=", value: "user-ada" },
      include: {
        orders: {
          where: { field: "status", op: "=", value: "PAID" },
          select: { id: true, total: true },
          sort: [{ field: "total", direction: "desc" }],
        },
      },
    });
    const [row] = result.data as { orders: { id: string; total: number }[] }[];
    expect(row?.orders).toEqual([{ id: "order-ada-1", total: 100 }]);
  });

  test("select and include together (Prisma disallows both at the top level; this adapter merges them)", async () => {
    const result = await run({
      where: { field: "id", op: "=", value: "user-ada" },
      select: { id: true, name: true },
      include: { orders: true },
    });
    const [row] = result.data as { id: string; name: string; orders: unknown[] }[];
    expect(row?.id).toBe("user-ada");
    expect(row?.name).toBe("Ada Lovelace");
    expect(row?.orders).toHaveLength(2);
  });
});
