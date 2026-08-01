import { describe, expect, test } from "vitest";
import { normalizeQuery } from "../src/normalize/normalize.js";
import type { DataSieveQuery } from "../src/query/query.js";
import type { Order, User } from "./fixtures.js";

describe("normalizeQuery", () => {
  test("returns an all-null/empty AST for an empty query", () => {
    const ast = normalizeQuery<User>({});

    expect(ast).toEqual({
      filter: null,
      search: null,
      sort: [],
      pagination: null,
      selection: null,
      relations: [],
      distinct: null,
      grouping: null,
      aggregations: [],
    });
  });

  test("normalizes a leaf condition", () => {
    const ast = normalizeQuery<User>({ where: { field: "status", op: "=", value: "ACTIVE" } });

    expect(ast.filter).toEqual({ type: "condition", field: "status", op: "=", value: "ACTIVE" });
  });

  test("normalizes no-value conditions without a `value` key", () => {
    const ast = normalizeQuery<User>({ where: { field: "profile", op: "isNotNull" } });

    expect(ast.filter).toEqual({ type: "condition", field: "profile", op: "isNotNull" });
    expect(ast.filter && "value" in ast.filter).toBe(false);
  });

  test("normalizes nested and/or/not", () => {
    const query: DataSieveQuery<User> = {
      where: {
        and: [
          { field: "status", op: "=", value: "ACTIVE" },
          { or: [{ field: "country", op: "=", value: "MX" }, { field: "country", op: "=", value: "US" }] },
          { not: { field: "deletedAt", op: "isNotNull" } },
        ],
      },
    };

    const ast = normalizeQuery(query);

    expect(ast.filter).toEqual({
      type: "and",
      nodes: [
        { type: "condition", field: "status", op: "=", value: "ACTIVE" },
        {
          type: "or",
          nodes: [
            { type: "condition", field: "country", op: "=", value: "MX" },
            { type: "condition", field: "country", op: "=", value: "US" },
          ],
        },
        { type: "not", node: { type: "condition", field: "deletedAt", op: "isNotNull" } },
      ],
    });
  });

  test("normalizes search with defaults applied", () => {
    const ast = normalizeQuery<User>({ search: { value: "john", fields: ["name", "email"] } });

    expect(ast.search).toEqual({ value: "john", mode: "contains", fields: ["name", "email"], caseSensitive: false });
  });

  test("normalizes sort", () => {
    const ast = normalizeQuery<User>({
      sort: [
        { field: "createdAt", direction: "desc" },
        { field: "name", direction: "asc", nulls: "last" },
      ],
    });

    expect(ast.sort).toEqual([
      { field: "createdAt", direction: "desc" },
      { field: "name", direction: "asc", nulls: "last" },
    ]);
  });

  test("passes pagination through unchanged", () => {
    const ast = normalizeQuery<User>({ pagination: { kind: "cursor", take: 25 } });

    expect(ast.pagination).toEqual({ kind: "cursor", take: 25 });
  });

  test("normalizes select to the list of true fields", () => {
    const ast = normalizeQuery<User>({ select: { id: true, name: true, age: false } });

    expect(ast.selection).toEqual({ fields: ["id", "name"] });
  });

  test("normalizes include, including nested relations and options", () => {
    const ast = normalizeQuery<User>({
      include: {
        profile: true,
        orders: {
          where: { field: "status", op: "=", value: "PAID" },
          select: { id: true, total: true },
          sort: [{ field: "createdAt", direction: "desc" }],
        },
      },
    });

    expect(ast.relations).toEqual(
      expect.arrayContaining([
        { field: "profile", filter: null, selection: null, sort: [], relations: [] },
        {
          field: "orders",
          filter: { type: "condition", field: "status", op: "=", value: "PAID" },
          selection: { fields: ["id", "total"] },
          sort: [{ field: "createdAt", direction: "desc" }],
          relations: [],
        },
      ]),
    );
    expect(ast.relations).toHaveLength(2);
  });

  test("normalizes distinct booleans and field lists", () => {
    expect(normalizeQuery<User>({ distinct: true }).distinct).toBe(true);
    expect(normalizeQuery<User>({ distinct: ["id"] }).distinct).toEqual(["id"]);
    expect(normalizeQuery<User>({}).distinct).toBeNull();
  });

  test("normalizes groupBy and having", () => {
    const query: DataSieveQuery<Order> = {
      groupBy: { fields: ["status"], having: { field: "status", op: "=", value: "PAID" } },
    };
    const ast = normalizeQuery(query);

    expect(ast.grouping).toEqual({
      fields: ["status"],
      having: { type: "condition", field: "status", op: "=", value: "PAID" },
    });
  });

  test("normalizes aggregations, omitting `field` for bare count", () => {
    const query: DataSieveQuery<Order> = {
      aggregations: [
        { fn: "count", alias: "orderCount" },
        { fn: "sum", field: "total", alias: "revenue" },
      ],
    };
    const ast = normalizeQuery(query);

    expect(ast.aggregations).toEqual([
      { fn: "count", alias: "orderCount" },
      { fn: "sum", field: "total", alias: "revenue" },
    ]);
  });
});
