/**
 * Page-number-based pagination, the common REST/UI-facing shape.
 *
 * @example
 * ```ts
 * const pagination: PaginationInput = { kind: "offset", page: 2, pageSize: 25 };
 * ```
 */
export interface OffsetPagination {
  kind: "offset";
  /** 1-indexed page number. */
  page: number;
  /** Number of records per page. */
  pageSize: number;
}

/**
 * Cursor-based pagination, for stable pagination over large or
 * frequently-mutated datasets. `cursor` is an opaque, adapter-issued
 * token (typically embedded in a prior response's `meta`) — DSQL itself
 * never inspects or constructs it.
 *
 * @example
 * ```ts
 * const pagination: PaginationInput = { kind: "cursor", cursor: "eyJpZCI6NDJ9", take: 25 };
 * ```
 */
export interface CursorPagination {
  kind: "cursor";
  /** Opaque cursor token. Omit to fetch the first page. */
  cursor?: string;
  /** Number of records to fetch. */
  take: number;
  /** Direction to page in, relative to `cursor`. Defaults to `"forward"`. */
  direction?: "forward" | "backward";
}

/**
 * Pagination input, `offset`- or `cursor`-based. Both strategies are
 * expressed through the same top-level `pagination` field on
 * `DataSieveQuery`, and both produce the same standardized response
 * shape (`DataSieveResponse.meta`) — switching strategies never changes
 * the response contract an application code against.
 */
export type PaginationInput = OffsetPagination | CursorPagination;
