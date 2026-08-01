import type { Condition } from "./condition.js";

/**
 * Logical AND of an arbitrary number of sub-trees. All must match.
 */
export interface AndInput<T> {
  and: WhereInput<T>[];
}

/**
 * Logical OR of an arbitrary number of sub-trees. At least one must match.
 */
export interface OrInput<T> {
  or: WhereInput<T>[];
}

/**
 * Logical negation of a single sub-tree.
 */
export interface NotInput<T> {
  not: WhereInput<T>;
}

/**
 * The recursive filter tree accepted by `DataSieveQuery.where`, directly
 * inspired by Odoo Domains: leaf {@link Condition}s combined with
 * unbounded `and`/`or`/`not` nesting. There is no depth limit — the type
 * is self-referential and TypeScript will happily check trees of any
 * practical depth.
 *
 * @example
 * ```ts
 * const where: WhereInput<User> = {
 *   and: [
 *     { field: "status", op: "=", value: "ACTIVE" },
 *     {
 *       or: [
 *         { field: "country", op: "=", value: "MX" },
 *         { field: "country", op: "=", value: "US" },
 *       ],
 *     },
 *     { not: { field: "deletedAt", op: "isNotNull" } },
 *   ],
 * };
 * ```
 */
export type WhereInput<T> = AndInput<T> | OrInput<T> | NotInput<T> | Condition<T>;
