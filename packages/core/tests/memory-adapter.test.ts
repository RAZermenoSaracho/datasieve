import { normalizeQuery, type DataSieveQuery } from "@razsdev/datasieve-query-language";
import { describe, expect, test } from "vitest";
import { createMemoryAdapter } from "../src/testing/memory-adapter.js";

interface Item {
  id: string;
  name: string;
  category: "A" | "B";
  price: number;
  tags: string[];
  profile: { region: string };
  bio: string | null;
  createdAt: Date;
}

const items: Item[] = [
  { id: "1", name: "Alpha", category: "A", price: 10, tags: ["red"], profile: { region: "west" }, bio: null, createdAt: new Date("2024-01-01") },
  { id: "2", name: "Bravo", category: "B", price: 20, tags: ["blue", "red"], profile: { region: "east" }, bio: "hi", createdAt: new Date("2024-02-01") },
  { id: "3", name: "Charlie", category: "A", price: 30, tags: [], profile: { region: "west" }, bio: null, createdAt: new Date("2024-03-01") },
  { id: "4", name: "Delta", category: "B", price: 40, tags: ["blue"], profile: { region: "west" }, bio: "hey", createdAt: new Date("2024-04-01") },
];

async function run(query: DataSieveQuery<Item>) {
  const adapter = createMemoryAdapter<Item>();
  return adapter.execute(normalizeQuery(query), items);
}

describe("createMemoryAdapter", () => {
  test("filters with equality", async () => {
    const result = await run({ where: { field: "category", op: "=", value: "A" } });
    expect(result.data.map((item) => item.id)).toEqual(["1", "3"]);
  });

  test("filters with and/or/not", async () => {
    const result = await run({
      where: {
        and: [{ field: "category", op: "=", value: "B" }, { not: { field: "price", op: ">", value: 25 } }],
      },
    });
    expect(result.data.map((item) => item.id)).toEqual(["2"]);
  });

  test("filters with in/between/contains/startsWith", async () => {
    expect((await run({ where: { field: "id", op: "in", value: ["1", "2"] } })).data.map((i) => i.id)).toEqual(["1", "2"]);
    expect((await run({ where: { field: "price", op: "between", value: [15, 35] } })).data.map((i) => i.id)).toEqual(["2", "3"]);
    expect((await run({ where: { field: "tags", op: "contains", value: "blue" } })).data.map((i) => i.id)).toEqual(["2", "4"]);
    expect((await run({ where: { field: "name", op: "startsWith", value: "Cha" } })).data.map((i) => i.id)).toEqual(["3"]);
  });

  test("filters isNull/isNotNull", async () => {
    expect((await run({ where: { field: "bio", op: "isNull" } })).data.map((i) => i.id)).toEqual(["1", "3"]);
    expect((await run({ where: { field: "bio", op: "isNotNull" } })).data.map((i) => i.id)).toEqual(["2", "4"]);
  });

  test("filters through nested object dot paths", async () => {
    const result = await run({ where: { field: "profile.region", op: "=", value: "west" } });
    expect(result.data.map((item) => item.id)).toEqual(["1", "3", "4"]);
  });

  test("throws on the reserved childOf/parentOf operators", async () => {
    await expect(run({ where: { field: "id", op: "childOf", value: "1" } })).rejects.toThrow(/childOf/);
  });

  test("searches across the requested fields", async () => {
    const result = await run({ search: { value: "al", mode: "contains", fields: ["name"] } });
    expect(result.data.map((item) => item.id)).toEqual(["1"]);
  });

  test("sorts by a single field", async () => {
    const result = await run({ sort: [{ field: "price", direction: "desc" }] });
    expect(result.data.map((item) => item.id)).toEqual(["4", "3", "2", "1"]);
  });

  test("sorts by multiple keys in priority order", async () => {
    const result = await run({ sort: [{ field: "category", direction: "asc" }, { field: "price", direction: "desc" }] });
    expect(result.data.map((item) => item.id)).toEqual(["3", "1", "4", "2"]);
  });

  test("projects only the selected fields", async () => {
    const result = await run({ where: { field: "id", op: "=", value: "1" }, select: { id: true, name: true } });
    expect(result.data).toEqual([{ id: "1", name: "Alpha" }]);
  });

  test("paginates with offset", async () => {
    const result = await run({ sort: [{ field: "id", direction: "asc" }], pagination: { kind: "offset", page: 2, pageSize: 2 } });
    expect(result.data.map((item) => item.id)).toEqual(["3", "4"]);
    expect(result.total).toBe(4);
  });

  test("paginates forward with a cursor", async () => {
    const adapter = createMemoryAdapter<Item>();
    const ast = normalizeQuery<Item>({ sort: [{ field: "id", direction: "asc" }], pagination: { kind: "cursor", take: 2 } });

    const firstPage = await adapter.execute(ast, items);
    expect(firstPage.data.map((item) => item.id)).toEqual(["1", "2"]);
    const nextCursor = firstPage.nextCursor;
    expect(nextCursor).not.toBeNull();
    if (!nextCursor) throw new Error("expected a next cursor");

    const secondAst = normalizeQuery<Item>({
      sort: [{ field: "id", direction: "asc" }],
      pagination: { kind: "cursor", take: 2, cursor: nextCursor },
    });
    const secondPage = await adapter.execute(secondAst, items);
    expect(secondPage.data.map((item) => item.id)).toEqual(["3", "4"]);
    expect(secondPage.nextCursor).toBeNull();
  });
});
