import type { SortNode } from "@datasieve/query-language";
import { nestPath } from "./path.js";

/**
 * Translates DSQL {@link SortNode}s into Prisma's `orderBy` array.
 * Earlier entries take precedence, exactly like DSQL's own `SortInput`
 * ordering. Dot paths are nested the same way `translateFilter` nests
 * `where` (see {@link nestPath} and its to-one-relation-only caveat).
 *
 * @example
 * ```ts
 * translateSort([
 *   { field: "createdAt", direction: "desc" },
 *   { field: "profile.region", direction: "asc" },
 * ]);
 * // -> [{ createdAt: "desc" }, { profile: { region: "asc" } }]
 * ```
 */
export function translateSort(sort: readonly SortNode[]): Record<string, unknown>[] {
  return sort.map(({ field, direction, nulls }) => {
    const leaf = nulls ? { sort: direction, nulls } : direction;
    return nestPath(field.split("."), leaf);
  });
}
