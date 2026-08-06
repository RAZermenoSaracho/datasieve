import type { PaginationInput } from "@razsdev/datasieve-query-language";
import type { AdapterExecuteResult } from "../adapter/adapter.js";
import type { DataSieveResponse } from "./response.js";

/**
 * Builds the standardized {@link DataSieveResponse} from an adapter's raw
 * result, the pagination that was actually executed, and how long
 * execution took. This is the one place pagination math (`pageCount`,
 * `hasNext`, `hasPrevious`) is computed — centrally, in Core — so no
 * adapter has to reimplement it, and every adapter's response behaves
 * identically for the same inputs.
 *
 * `result.data` is trusted to already be shaped like `T` — the adapter's
 * `TRaw` and the query's `T` are the application's responsibility to
 * keep aligned (an adapter queries whatever resource the application
 * passed in), the same way `normalizeQuery` in `@razsdev/datasieve-query-language`
 * treats its one generic-erasure boundary.
 *
 * @example
 * ```ts
 * const response = buildResponse<User>(
 *   { data: rows, total: 42 },
 *   { kind: "offset", page: 1, pageSize: 20 },
 *   3.2,
 * );
 * // response.meta -> { total: 42, page: 1, pageSize: 20, pageCount: 3,
 * //                     hasNext: true, hasPrevious: false, cursor: null, executionTime: 3.2 }
 * ```
 *
 * `pagination` is `undefined` for a query that omitted `pagination`
 * against an engine with no `defaultPageSize` configured — it ran
 * unpaginated, and `meta` reports that honestly rather than inventing a
 * page:
 *
 * @example
 * ```ts
 * const response = buildResponse<User>({ data: rows, total: 3 }, undefined, 1.1);
 * // response.meta -> { total: 3, page: null, pageSize: null, pageCount: null,
 * //                     hasNext: false, hasPrevious: false, cursor: null, executionTime: 1.1 }
 * ```
 */
export function buildResponse<T>(
  result: AdapterExecuteResult,
  pagination: PaginationInput | undefined,
  executionTime: number,
): DataSieveResponse<T> {
  const total = result.total ?? null;
  const data = result.data as T[];

  if (!pagination) {
    return {
      data,
      meta: {
        total,
        page: null,
        pageSize: null,
        pageCount: null,
        hasNext: false,
        hasPrevious: false,
        cursor: null,
        executionTime,
      },
    };
  }

  if (pagination.kind === "offset") {
    const { page, pageSize } = pagination;
    return {
      data,
      meta: {
        total,
        page,
        pageSize,
        pageCount: total !== null ? Math.ceil(total / pageSize) : null,
        hasNext: total !== null ? page * pageSize < total : data.length === pageSize,
        hasPrevious: page > 1,
        cursor: null,
        executionTime,
      },
    };
  }

  const pageSize = pagination.take;
  const nextCursor = result.nextCursor ?? null;
  const previousCursor = result.previousCursor ?? null;
  return {
    data,
    meta: {
      total,
      page: null,
      pageSize,
      pageCount: total !== null ? Math.ceil(total / pageSize) : null,
      hasNext: nextCursor !== null,
      hasPrevious: previousCursor !== null,
      cursor: { next: nextCursor, previous: previousCursor },
      executionTime,
    },
  };
}
