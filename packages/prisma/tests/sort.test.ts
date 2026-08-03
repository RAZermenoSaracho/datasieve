import { normalizeQuery, type DataSieveQuery } from "@datasieve/query-language";
import { describe, expect, test } from "vitest";
import { prismaAdapter } from "../src/adapter.js";
import { prisma } from "./client.js";
import type { User } from "./fixtures.js";

const adapter = prismaAdapter(prisma);

async function ids(query: DataSieveQuery<User>): Promise<string[]> {
  const result = await adapter.execute(normalizeQuery(query), prisma.user);
  return (result.data as { id: string }[]).map((row) => row.id);
}

describe("prismaAdapter — sort", () => {
  test("sorts ascending by a single field", async () => {
    expect(await ids({ sort: [{ field: "age", direction: "asc" }] })).toEqual([
      "user-linus",
      "user-ada",
      "user-grace",
      "user-margaret",
    ]);
  });

  test("sorts descending by a single field", async () => {
    expect(await ids({ sort: [{ field: "age", direction: "desc" }] })).toEqual([
      "user-margaret",
      "user-grace",
      "user-ada",
      "user-linus",
    ]);
  });

  test("sorts by multiple keys in priority order", async () => {
    // "ACTIVE" < "INACTIVE" alphabetically, so the three ACTIVE users
    // (sorted by age desc: margaret 50, ada 30, linus 25) come first,
    // followed by the one INACTIVE user (grace).
    expect(
      await ids({ sort: [{ field: "status", direction: "asc" }, { field: "age", direction: "desc" }] }),
    ).toEqual(["user-margaret", "user-ada", "user-linus", "user-grace"]);
  });

  test("sorts through a to-one nested relation", async () => {
    // "east" (Grace) sorts before "west" (Ada/Linus) ascending; where a
    // profile-less record (Margaret) lands depends on SQL's NULL-ordering
    // default, which this test deliberately doesn't assert on.
    const result = await ids({ sort: [{ field: "profile.region", direction: "asc" }] });
    expect(result.indexOf("user-grace")).toBeLessThan(result.indexOf("user-ada"));
    expect(result.indexOf("user-grace")).toBeLessThan(result.indexOf("user-linus"));
  });
});
