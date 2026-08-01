import { ParseError, QueryValidationError, type DataSieveQuery } from "@datasieve/query-language";
import { describe, expect, test, vi } from "vitest";
import type { DataSieveAdapter } from "../src/adapter/adapter.js";
import { DataSieveExecutionError } from "../src/errors/errors.js";
import { createDataSieve } from "../src/engine/create-data-sieve.js";
import type { DataSievePlugin } from "../src/plugin/plugin.js";
import { createMemoryAdapter } from "../src/testing/memory-adapter.js";

interface User {
  id: string;
  name: string;
  status: "ACTIVE" | "INACTIVE";
  deletedAt: Date | null;
}

const users: User[] = [
  { id: "1", name: "Ada", status: "ACTIVE", deletedAt: null },
  { id: "2", name: "Grace", status: "INACTIVE", deletedAt: null },
  { id: "3", name: "Linus", status: "ACTIVE", deletedAt: new Date("2024-01-01") },
];

describe("createDataSieve / engine.query", () => {
  test("runs filter, sort, and select end to end against the memory adapter", async () => {
    const engine = createDataSieve({ adapter: createMemoryAdapter<User>() });

    const response = await engine.query<User>({
      resource: users,
      query: {
        where: { field: "status", op: "=", value: "ACTIVE" },
        sort: [{ field: "name", direction: "asc" }],
        select: { id: true, name: true },
      },
    });

    expect(response.data).toEqual([
      { id: "1", name: "Ada" },
      { id: "3", name: "Linus" },
    ]);
    expect(response.meta.total).toBe(2);
  });

  test("defaults to offset pagination with the configured page size when omitted", async () => {
    const engine = createDataSieve({ adapter: createMemoryAdapter<User>(), defaultPageSize: 1 });

    const response = await engine.query<User>({ resource: users, query: {} });

    expect(response.meta.page).toBe(1);
    expect(response.meta.pageSize).toBe(1);
    expect(response.data).toHaveLength(1);
  });

  test("propagates parse errors without reaching the adapter", async () => {
    const execute = vi.fn();
    const adapter: DataSieveAdapter<User[]> = { name: "spy", execute };
    const engine = createDataSieve({ adapter });

    await expect(engine.query<User>({ resource: users, query: "not an object" })).rejects.toBeInstanceOf(ParseError);
    expect(execute).not.toHaveBeenCalled();
  });

  test("propagates validation errors without reaching the adapter", async () => {
    const execute = vi.fn();
    const adapter: DataSieveAdapter<User[]> = { name: "spy", execute };
    const engine = createDataSieve({ adapter });

    await expect(
      engine.query<User>({ resource: users, query: { where: { and: [] } } }),
    ).rejects.toBeInstanceOf(QueryValidationError);
    expect(execute).not.toHaveBeenCalled();
  });

  test("wraps adapter failures in DataSieveExecutionError", async () => {
    const adapter: DataSieveAdapter<User[]> = {
      name: "broken",
      execute: async () => {
        throw new Error("connection refused");
      },
    };
    const engine = createDataSieve({ adapter });

    const error = await engine.query<User>({ resource: users, query: {} }).catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(DataSieveExecutionError);
    expect((error as DataSieveExecutionError).adapterName).toBe("broken");
    expect((error as Error).message).toContain("connection refused");
  });

  test("a beforeNormalize plugin can inject an additional filter (e.g. soft delete)", async () => {
    const excludeDeleted: DataSievePlugin = {
      name: "soft-delete",
      // A hook generic over any T can't statically know T has a
      // "deletedAt" field, the same way a real soft-delete plugin
      // wouldn't for an arbitrary resource — hence the cast below.
      beforeNormalize<T>(query: DataSieveQuery<T>) {
        return {
          ...query,
          where: query.where
            ? { and: [query.where, { field: "deletedAt", op: "isNull" }] }
            : { field: "deletedAt", op: "isNull" },
        } as DataSieveQuery<T>;
      },
    };
    const engine = createDataSieve({ adapter: createMemoryAdapter<User>(), plugins: [excludeDeleted] });

    const response = await engine.query<User>({
      resource: users,
      query: { where: { field: "status", op: "=", value: "ACTIVE" } },
    });

    // Linus is ACTIVE but soft-deleted, so only Ada should remain.
    expect(response.data.map((u) => u.id)).toEqual(["1"]);
  });

  test("plugin hooks run in order and share context state across stages", async () => {
    const calls: string[] = [];
    const plugin: DataSievePlugin = {
      name: "tracer",
      beforeNormalize(query, ctx) {
        ctx.state.started = true;
        calls.push("beforeNormalize");
        return query;
      },
      beforeExecute(ast, ctx) {
        expect(ctx.state.started).toBe(true);
        calls.push("beforeExecute");
        return ast;
      },
      afterExecute(result) {
        calls.push("afterExecute");
        return result;
      },
      afterTransform(response) {
        calls.push("afterTransform");
        return response;
      },
    };
    const engine = createDataSieve({ adapter: createMemoryAdapter<User>(), plugins: [plugin] });

    await engine.query<User>({ resource: users, query: {} });

    expect(calls).toEqual(["beforeNormalize", "beforeExecute", "afterExecute", "afterTransform"]);
  });

  test("notifies onError on failure without suppressing the original error", async () => {
    const onError = vi.fn();
    const plugin: DataSievePlugin = { name: "observer", onError };
    const adapter: DataSieveAdapter<User[]> = {
      name: "broken",
      execute: async () => {
        throw new Error("boom");
      },
    };
    const engine = createDataSieve({ adapter, plugins: [plugin] });

    await expect(engine.query<User>({ resource: users, query: {} })).rejects.toBeInstanceOf(DataSieveExecutionError);
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError.mock.calls[0]?.[0]).toBeInstanceOf(DataSieveExecutionError);
  });

  test("a throwing onError does not suppress the original error", async () => {
    const plugin: DataSievePlugin = {
      name: "faulty-observer",
      onError: () => {
        throw new Error("observer itself is broken");
      },
    };
    const adapter: DataSieveAdapter<User[]> = {
      name: "broken",
      execute: async () => {
        throw new Error("original failure");
      },
    };
    const engine = createDataSieve({ adapter, plugins: [plugin] });

    const error = await engine.query<User>({ resource: users, query: {} }).catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(DataSieveExecutionError);
    expect((error as Error).message).toContain("original failure");
  });
});
