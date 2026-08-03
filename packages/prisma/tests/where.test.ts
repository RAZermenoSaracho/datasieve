import { normalizeQuery, type DataSieveQuery } from "@datasieve/query-language";
import { describe, expect, test } from "vitest";
import { prismaAdapter } from "../src/adapter.js";
import { prisma } from "./client.js";
import type { User } from "./fixtures.js";

const adapter = prismaAdapter(prisma);

async function ids(query: DataSieveQuery<User>): Promise<string[]> {
  const result = await adapter.execute(normalizeQuery(query), prisma.user);
  return (result.data as { id: string }[]).map((row) => row.id).sort();
}

describe("prismaAdapter — where", () => {
  test("equality", async () => {
    expect(await ids({ where: { field: "status", op: "=", value: "ACTIVE" } })).toEqual(
      ["user-ada", "user-linus", "user-margaret"].sort(),
    );
  });

  test("and/or/not", async () => {
    expect(
      await ids({
        where: { and: [{ field: "status", op: "=", value: "ACTIVE" }, { field: "age", op: ">", value: 28 }] },
      }),
    ).toEqual(["user-ada", "user-margaret"].sort());

    expect(
      await ids({
        where: { or: [{ field: "status", op: "=", value: "INACTIVE" }, { field: "age", op: "<", value: 26 }] },
      }),
    ).toEqual(["user-grace", "user-linus"].sort());

    expect(await ids({ where: { not: { field: "status", op: "=", value: "ACTIVE" } } })).toEqual(["user-grace"]);
  });

  test("in / between / startsWith", async () => {
    expect(await ids({ where: { field: "id", op: "in", value: ["user-ada", "user-grace"] } })).toEqual(
      ["user-ada", "user-grace"].sort(),
    );
    expect(await ids({ where: { field: "age", op: "between", value: [26, 45] } })).toEqual(
      ["user-ada", "user-grace"].sort(),
    );
    expect(await ids({ where: { field: "name", op: "startsWith", value: "Grace" } })).toEqual(["user-grace"]);
  });

  test("isNull / isNotNull", async () => {
    expect(await ids({ where: { field: "bio", op: "isNull" } })).toEqual(["user-grace", "user-margaret"].sort());
    expect(await ids({ where: { field: "bio", op: "isNotNull" } })).toEqual(["user-ada", "user-linus"].sort());
  });

  test("filters through a to-one nested relation", async () => {
    // Margaret has no profile, so a nested `profile.region` filter excludes her
    // (Prisma's nested-where on an optional relation requires the relation to exist).
    expect(await ids({ where: { field: "profile.region", op: "=", value: "west" } })).toEqual(
      ["user-ada", "user-linus"].sort(),
    );
  });

  test("exists / notExists on a to-many relation", async () => {
    expect(await ids({ where: { field: "orders", op: "exists" } })).toEqual(
      ["user-ada", "user-grace", "user-margaret"].sort(),
    );
    expect(await ids({ where: { field: "orders", op: "notExists" } })).toEqual(["user-linus"]);
  });

  test("throws a clear error for the reserved childOf/parentOf operators", async () => {
    await expect(ids({ where: { field: "id", op: "childOf", value: "user-ada" } })).rejects.toThrow(/childOf/);
  });
});
