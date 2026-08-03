import type { PaginationNode } from "@datasieve/query-language";

/** Cursor-pagination-specific options; see {@link prismaAdapter}. */
export interface CursorOptions {
  /** The unique field cursors are based on. Defaults to `"id"`. */
  cursorField: string;
  /** Parses a cursor token back into the value `cursorField` expects (e.g. `Number` for an `Int` id). Defaults to the identity function (string ids). */
  parseCursorValue: (raw: string) => unknown;
}

/** Prisma `findMany` arguments covering pagination only (`skip`/`take`/`cursor`). */
export type PaginationArgs = Record<string, unknown>;

/**
 * Builds the `skip`/`take`/`cursor` arguments for one page.
 *
 * Offset pagination maps straight onto Prisma's own `skip`/`take` — the
 * total needed for `hasNext`/`hasPrevious`/`pageCount` is obtained via a
 * separate `count()` call in `adapter.ts`, not from here.
 *
 * Cursor pagination uses Prisma's native cursor support
 * (`cursor: {[field]: value}, skip: 1` to exclude the cursor row itself,
 * `take: ±N` for direction) combined with the standard "fetch one extra
 * row" trick — requesting `take + 1` rows so {@link resolveCursorPage}
 * can tell whether another page exists without a second query. No
 * `total`/count is computed for cursor pagination (matching
 * `@datasieve/core`'s own documented allowance for cursor setups to skip
 * counting for performance).
 */
export function buildPaginationArgs(pagination: PaginationNode, cursor: CursorOptions): PaginationArgs {
  if (pagination.kind === "offset") {
    return { skip: (pagination.page - 1) * pagination.pageSize, take: pagination.pageSize };
  }

  const overfetch = pagination.take + 1;
  const direction = pagination.direction ?? "forward";
  const signedTake = direction === "forward" ? overfetch : -overfetch;

  if (pagination.cursor === undefined) {
    return { take: signedTake };
  }

  return {
    cursor: { [cursor.cursorField]: cursor.parseCursorValue(pagination.cursor) },
    skip: 1,
    take: signedTake,
  };
}

/** The page of rows actually requested, plus continuation cursors. */
export interface CursorPage {
  data: unknown[];
  nextCursor: string | null;
  previousCursor: string | null;
}

/**
 * Trims an overfetched cursor-mode result (see {@link buildPaginationArgs})
 * down to the requested page size and derives `nextCursor`/`previousCursor`
 * from whether the extra row was present.
 */
export function resolveCursorPage(rows: readonly unknown[], pagination: PaginationNode, cursor: CursorOptions): CursorPage {
  if (pagination.kind !== "cursor") {
    return { data: [...rows], nextCursor: null, previousCursor: null };
  }

  const { take } = pagination;
  const direction = pagination.direction ?? "forward";
  const hadCursor = pagination.cursor !== undefined;

  if (direction === "forward") {
    const hasNext = rows.length > take;
    const data = hasNext ? rows.slice(0, take) : [...rows];
    return {
      data,
      nextCursor: hasNext ? cursorValue(data[data.length - 1], cursor) : null,
      previousCursor: hadCursor && data.length > 0 ? cursorValue(data[0], cursor) : null,
    };
  }

  const hasPrevious = rows.length > take;
  const data = hasPrevious ? rows.slice(rows.length - take) : [...rows];
  return {
    data,
    nextCursor: hadCursor && data.length > 0 ? cursorValue(data[data.length - 1], cursor) : null,
    previousCursor: hasPrevious ? cursorValue(data[0], cursor) : null,
  };
}

function cursorValue(row: unknown, cursor: CursorOptions): string {
  const value = (row as Record<string, unknown>)[cursor.cursorField];
  return String(value);
}
