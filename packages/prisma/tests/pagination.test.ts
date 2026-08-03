import { normalizeQuery, type DataSieveQuery } from "@razsdev/datasieve-query-language";
import { describe, expect, test } from "vitest";
import { prismaAdapter } from "../src/adapter.js";
import { prisma } from "./client.js";
import type { User } from "./fixtures.js";

const adapter = prismaAdapter(prisma);

function run(query: DataSieveQuery<User>) {
  return adapter.execute(normalizeQuery(query), prisma.user);
}

describe("prismaAdapter — pagination", () => {
  test("offset pagination returns a total via a consistent count", async () => {
    const page1 = await run({ sort: [{ field: "id", direction: "asc" }], pagination: { kind: "offset", page: 1, pageSize: 2 } });
    expect((page1.data as { id: string }[]).map((r) => r.id)).toEqual(["user-ada", "user-grace"]);
    expect(page1.total).toBe(4);

    const page2 = await run({ sort: [{ field: "id", direction: "asc" }], pagination: { kind: "offset", page: 2, pageSize: 2 } });
    expect((page2.data as { id: string }[]).map((r) => r.id)).toEqual(["user-linus", "user-margaret"]);
    expect(page2.total).toBe(4);
  });

  test("forward cursor pagination walks the full set without duplicates or gaps", async () => {
    const firstPage = await run({ sort: [{ field: "id", direction: "asc" }], pagination: { kind: "cursor", take: 2 } });
    const firstIds = (firstPage.data as { id: string }[]).map((r) => r.id);
    expect(firstIds).toEqual(["user-ada", "user-grace"]);
    expect(firstPage.total).toBeUndefined();
    expect(firstPage.nextCursor).toBe("user-grace");

    const nextCursor = firstPage.nextCursor;
    if (!nextCursor) throw new Error("expected a next cursor");
    const secondPage = await run({
      sort: [{ field: "id", direction: "asc" }],
      pagination: { kind: "cursor", take: 2, cursor: nextCursor },
    });
    const secondIds = (secondPage.data as { id: string }[]).map((r) => r.id);
    expect(secondIds).toEqual(["user-linus", "user-margaret"]);
    expect(secondPage.nextCursor).toBeNull();
  });

  test("backward cursor pagination returns the page before the cursor", async () => {
    const page = await run({
      sort: [{ field: "id", direction: "asc" }],
      pagination: { kind: "cursor", take: 2, cursor: "user-margaret", direction: "backward" },
    });
    expect((page.data as { id: string }[]).map((r) => r.id)).toEqual(["user-grace", "user-linus"]);
  });
});
