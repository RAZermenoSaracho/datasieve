import { describe, expect, test } from "vitest";
import { parseQuery } from "../src/parse/parse.js";
import type { User } from "./fixtures.js";

describe("parseQuery", () => {
  test("accepts a well-shaped query object", () => {
    const result = parseQuery<User>({
      where: { field: "status", op: "=", value: "ACTIVE" },
      pagination: { kind: "offset", page: 1, pageSize: 20 },
    });

    expect(result.success).toBe(true);
  });

  test("accepts an empty query", () => {
    expect(parseQuery<User>({}).success).toBe(true);
  });

  test("rejects non-object input", () => {
    const result = parseQuery<User>("not a query");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.issues[0]?.code).toBe("INVALID_ROOT");
    }
  });

  test("rejects null and arrays", () => {
    expect(parseQuery<User>(null).success).toBe(false);
    expect(parseQuery<User>([]).success).toBe(false);
  });

  test("rejects unknown top-level keys", () => {
    const result = parseQuery<User>({ wehre: { field: "status", op: "=", value: "ACTIVE" } });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.issues).toEqual([{ path: "wehre", message: 'Unknown query key "wehre".', code: "UNKNOWN_KEY" }]);
    }
  });
});
