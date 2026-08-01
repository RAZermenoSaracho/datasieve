/**
 * Cursor pagination bookkeeping. Present only when the query used cursor
 * pagination and the adapter reported at least one cursor; `null`
 * otherwise (including for offset-paginated queries).
 */
export interface DataSieveResponseCursor {
  next: string | null;
  previous: string | null;
}

/**
 * The standardized metadata every DataSieve response carries, regardless
 * of adapter or pagination strategy — this shape is owned by Core, never
 * by an adapter (see `CLAUDE.md`'s "Standard Response").
 *
 * `total`, `page`, and `pageCount` are nullable because they honestly
 * don't always apply: cursor pagination may not have a "page number" at
 * all, and an adapter may skip counting matched records for performance.
 * `pageSize`, `hasNext`, and `hasPrevious` are always defined — Core
 * computes them centrally in `buildResponse` so adapters never have to.
 */
export interface DataSieveResponseMeta {
  /** Total records matching the filter, ignoring pagination. `null` if not computed. */
  total: number | null;
  /** 1-indexed page number. `null` for cursor-paginated queries. */
  page: number | null;
  /** Records requested per page (offset `pageSize`, or cursor `take`). */
  pageSize: number;
  /** `null` when `total` is `null`, since page count can't be derived without it. */
  pageCount: number | null;
  /** Whether there is at least one more record beyond this page. */
  hasNext: boolean;
  /** Whether there is at least one record before this page. */
  hasPrevious: boolean;
  /** Cursor tokens, present only for cursor-paginated queries. */
  cursor: DataSieveResponseCursor | null;
  /** Wall-clock time, in milliseconds, spent inside the adapter's `execute`. */
  executionTime: number;
}

/**
 * The standardized response contract every DataSieve query resolves to,
 * regardless of which adapter answered it. Per `CLAUDE.md`, this shape
 * belongs to Core — an application written against it never needs to
 * change when the underlying storage technology changes.
 */
export interface DataSieveResponse<T> {
  data: T[];
  meta: DataSieveResponseMeta;
}
