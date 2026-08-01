import { describe, expect, test } from "vitest";
import { validateQuery } from "../src/validate/validate.js";
import type { DataSieveQuery } from "../src/query/query.js";
import type { Order, User } from "./fixtures.js";

describe("validateQuery", () => {
  test("passes for a well-formed query", () => {
    const query: DataSieveQuery<User> = {
      where: { field: "status", op: "=", value: "ACTIVE" },
      search: { value: "john", fields: ["name"] },
      pagination: { kind: "offset", page: 1, pageSize: 20 },
    };

    expect(validateQuery(query)).toEqual({ valid: true });
  });

  test("flags an empty and/or", () => {
    const query: DataSieveQuery<User> = { where: { and: [] } };

    const result = validateQuery(query);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.issues.some((issue) => issue.code === "EMPTY_AND")).toBe(true);
    }
  });

  test("flags empty search fields", () => {
    const query: DataSieveQuery<User> = { search: { value: "john", fields: [] } };

    const result = validateQuery(query);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.issues[0]?.code).toBe("EMPTY_SEARCH_FIELDS");
    }
  });

  test("flags invalid offset pagination", () => {
    const query: DataSieveQuery<User> = { pagination: { kind: "offset", page: 0, pageSize: -1 } };

    const result = validateQuery(query);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.issues.map((issue) => issue.code)).toEqual(
        expect.arrayContaining(["INVALID_PAGE", "INVALID_PAGE_SIZE"]),
      );
    }
  });

  test("flags empty groupBy fields", () => {
    const query: DataSieveQuery<Order> = { groupBy: { fields: [] } };

    const result = validateQuery(query);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.issues[0]?.code).toBe("EMPTY_GROUP_BY");
    }
  });

  test("flags aggregations missing alias or a required field", () => {
    const query: DataSieveQuery<Order> = {
      aggregations: [
        { fn: "sum", field: "total", alias: "" },
      ],
    };

    const result = validateQuery(query);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.issues.some((issue) => issue.code === "MISSING_ALIAS")).toBe(true);
    }
  });
});
