import type { IsRelation, NonNull } from "../utils/type-utils.js";

/**
 * Keys of `T` whose value is a scalar (string/number/boolean/bigint/Date,
 * or an array of such) rather than a relation. This is the complement of
 * `RelationKeys<T>` (see `selection/include.ts`) — together they
 * partition every key of `T`.
 */
export type ScalarKeys<T> = {
  [K in keyof T]-?: IsRelation<NonNull<T[K]>> extends true ? never : K;
}[keyof T] &
  string;

/**
 * Field selection for `T`'s scalar fields, Prisma-style: set a field to
 * `true` to include it. Relation fields are selected via `include`
 * instead (see `selection/include.ts`) since they typically need their
 * own nested query options.
 *
 * @example
 * ```ts
 * const select: SelectInput<User> = { id: true, name: true, email: true };
 * ```
 */
export type SelectInput<T> = Partial<Record<ScalarKeys<T>, boolean>>;
