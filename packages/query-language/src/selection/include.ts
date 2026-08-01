import type { WhereInput } from "../filter/where.js";
import type { SortInput } from "../sort/sort.js";
import { type DefaultDepth, type IsRelation, type NonNull, type Prev, type UnwrapArray } from "../utils/type-utils.js";
import type { SelectInput } from "./select.js";

/**
 * Keys of `T` whose value is a relation — an object, or an array of
 * objects (excluding `Date`). Complement of `ScalarKeys<T>`.
 */
export type RelationKeys<T> = {
  [K in keyof T]-?: IsRelation<NonNull<T[K]>> extends true ? K : never;
}[keyof T] &
  string;

/**
 * Nested query options for a single included relation of element type
 * `R`. Mirrors the shape of the root query for the parts that make sense
 * per-relation: filtering, field selection, further nested includes, and
 * sorting. Pagination/search/grouping are intentionally omitted here —
 * they apply to the root resource, not to a relation traversal.
 */
export interface RelationIncludeOptions<R, D extends number> {
  where?: WhereInput<R>;
  select?: SelectInput<R>;
  include?: IncludeInput<R, Prev[D]>;
  sort?: SortInput<R>;
}

/**
 * Which relations of `T` to eagerly load, and how. `true` includes the
 * relation as-is; an options object scopes it further (Prisma-style).
 *
 * Recursion through nested relations is depth-limited the same way
 * {@link FieldPath} is, so self-referential/circular domain models don't
 * produce an infinite type.
 *
 * @example
 * ```ts
 * const include: IncludeInput<User> = {
 *   orders: {
 *     where: { field: "status", op: "=", value: "PAID" },
 *     select: { id: true, total: true },
 *     sort: [{ field: "createdAt", direction: "desc" }],
 *   },
 *   profile: true,
 * };
 * ```
 */
export type IncludeInput<T, D extends number = DefaultDepth> = D extends never
  ? never
  : Partial<{
      [K in RelationKeys<T>]: boolean | RelationIncludeOptions<UnwrapArray<NonNull<T[K]>>, D>;
    }>;
