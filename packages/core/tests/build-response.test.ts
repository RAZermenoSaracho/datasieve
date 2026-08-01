import { describe, expect, test } from "vitest";
import { buildResponse } from "../src/response/build-response.js";

describe("buildResponse", () => {
  describe("offset pagination", () => {
    test("computes pageCount/hasNext/hasPrevious from a known total", () => {
      const response = buildResponse(
        { data: [1, 2, 3], total: 42 },
        { kind: "offset", page: 2, pageSize: 3 },
        5,
      );

      expect(response).toEqual({
        data: [1, 2, 3],
        meta: {
          total: 42,
          page: 2,
          pageSize: 3,
          pageCount: 14,
          hasNext: true,
          hasPrevious: true,
          cursor: null,
          executionTime: 5,
        },
      });
    });

    test("reports no previous page on page 1", () => {
      const response = buildResponse({ data: [1], total: 1 }, { kind: "offset", page: 1, pageSize: 20 }, 1);

      expect(response.meta.hasPrevious).toBe(false);
    });

    test("reports no next page once the last page is reached", () => {
      const response = buildResponse({ data: [1, 2], total: 12 }, { kind: "offset", page: 6, pageSize: 2 }, 1);

      expect(response.meta.hasNext).toBe(false);
      expect(response.meta.pageCount).toBe(6);
    });

    test("falls back to a size heuristic for hasNext when total is unknown", () => {
      const fullPage = buildResponse({ data: [1, 2, 3] }, { kind: "offset", page: 1, pageSize: 3 }, 1);
      const partialPage = buildResponse({ data: [1, 2] }, { kind: "offset", page: 1, pageSize: 3 }, 1);

      expect(fullPage.meta.hasNext).toBe(true);
      expect(fullPage.meta.total).toBeNull();
      expect(fullPage.meta.pageCount).toBeNull();
      expect(partialPage.meta.hasNext).toBe(false);
    });
  });

  describe("cursor pagination", () => {
    test("reports page as null and derives hasNext/hasPrevious from cursors", () => {
      const response = buildResponse(
        { data: [1, 2], nextCursor: "2", previousCursor: null },
        { kind: "cursor", take: 2 },
        4,
      );

      expect(response.meta.page).toBeNull();
      expect(response.meta.hasNext).toBe(true);
      expect(response.meta.hasPrevious).toBe(false);
      expect(response.meta.cursor).toEqual({ next: "2", previous: null });
      expect(response.meta.pageSize).toBe(2);
    });

    test("reports no next page when the adapter returns no next cursor", () => {
      const response = buildResponse({ data: [1] }, { kind: "cursor", take: 2 }, 1);

      expect(response.meta.hasNext).toBe(false);
      expect(response.meta.hasPrevious).toBe(false);
      expect(response.meta.cursor).toEqual({ next: null, previous: null });
    });
  });
});
