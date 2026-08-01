import type { FieldPath } from "../fields/field-path.js";

/** Sort direction. */
export type SortDirection = "asc" | "desc";

/** Where `null` values are placed relative to non-null values when sorting. */
export type NullsPosition = "first" | "last";

/**
 * A single sort instruction on a field path of `T`. Multiple instructions
 * compose into a stable multi-key sort by appearing in order in a
 * `SortInput<T>` array — nested field paths (e.g. `"profile.company.name"`)
 * are supported the same as anywhere else in DSQL.
 *
 * @example
 * ```ts
 * const sort: SortInput<User> = [
 *   { field: "createdAt", direction: "desc" },
 *   { field: "name", direction: "asc" },
 * ];
 * ```
 */
export interface SortField<T> {
  field: FieldPath<T>;
  direction: SortDirection;
  /** Placement of `null` values. Adapter-dependent default if omitted. */
  nulls?: NullsPosition;
}

/**
 * An ordered list of {@link SortField}s. Earlier entries take precedence
 * over later ones, exactly like a SQL `ORDER BY a, b, c` clause — but
 * without ever mentioning SQL.
 */
export type SortInput<T> = SortField<T>[];
