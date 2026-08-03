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

describe("prismaAdapter — search", () => {
  test("matches across multiple fields, case-insensitively by default", async () => {
    expect(await ids({ search: { value: "GRACE", mode: "contains", fields: ["name", "email"] } })).toEqual([
      "user-grace",
    ]);
  });

  test("composes with where as an AND", async () => {
    expect(
      await ids({
        where: { field: "status", op: "=", value: "ACTIVE" },
        search: { value: "a", mode: "startsWith", fields: ["name"] },
      }),
    ).toEqual(["user-ada"]);
  });

  test("returns no matches when the term isn't found in any requested field", async () => {
    expect(await ids({ search: { value: "zzz-no-match", mode: "contains", fields: ["name", "email"] } })).toEqual(
      [],
    );
  });
});
