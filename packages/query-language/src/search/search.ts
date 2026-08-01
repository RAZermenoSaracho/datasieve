import type { FieldPath, FieldPathValue } from "../fields/field-path.js";

/** How a free-text {@link SearchInput} value is matched against its fields. */
export type SearchMode = "contains" | "startsWith" | "endsWith" | "exact";

/**
 * String-valued field paths of `T` — the only fields a free-text
 * {@link SearchInput} can target.
 */
export type SearchableFieldPath<T> = {
  [P in FieldPath<T>]: FieldPathValue<T, P> extends string ? P : never;
}[FieldPath<T>];

/**
 * Free-text search, independent from `where`. Whereas `where` expresses
 * precise, per-field boolean logic, `search` expresses "find `value`
 * somewhere across these fields" — the kind of single search box a UI
 * typically offers alongside structured filters.
 *
 * @example
 * ```ts
 * const search: SearchInput<User> = {
 *   value: "john",
 *   mode: "contains",
 *   fields: ["name", "email"],
 * };
 * ```
 */
export interface SearchInput<T> {
  /** The text to search for. */
  value: string;
  /** How `value` is matched against each field. Defaults to `"contains"`. */
  mode?: SearchMode;
  /** Which string fields to search across. */
  fields: SearchableFieldPath<T>[];
  /** Case-sensitivity of the match. Defaults to `false`. */
  caseSensitive?: boolean;
}
