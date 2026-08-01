import type { DefaultDepth, NonNull, Prev, Primitive, UnwrapArray } from "../utils/type-utils.js";

/**
 * All valid dot-notation field paths of `T`, inferred structurally from
 * `T`'s shape — no strings are hand-written anywhere in a consumer's code.
 *
 * - Nested objects are traversed with `.` (`"profile.company.name"`).
 * - Arrays are transparently unwrapped to their element type, so a
 *   relation like `orders: Order[]` yields both `"orders"` (the
 *   collection itself, useful with `exists`/`isNull`) and `"orders.total"`
 *   (a field on each element).
 * - `Date` is treated as a leaf, not an object to traverse into.
 * - Recursion is bounded (see {@link Prev}) so self-referential models
 *   (`User.manager: User`) resolve without TypeScript reporting
 *   "Type instantiation is excessively deep."
 *
 * @example
 * ```ts
 * interface User {
 *   id: string;
 *   name: string;
 *   profile: { company: { name: string } };
 *   orders: { id: string; total: number }[];
 * }
 *
 * type UserPath = FieldPath<User>;
 * // "id" | "name" | "profile" | "profile.company" | "profile.company.name"
 * // | "orders" | "orders.id" | "orders.total"
 * ```
 */
export type FieldPath<T, D extends number = DefaultDepth> = D extends never
  ? never
  : NonNull<T> extends Primitive
    ? never
    : NonNull<T> extends ReadonlyArray<infer E>
      ? FieldPath<E, D>
      : {
          [K in keyof NonNull<T> & string]: NonNull<NonNull<T>[K]> extends Primitive
            ? K
            : K | `${K}.${FieldPath<NonNull<T>[K], Prev[D]>}`;
        }[keyof NonNull<T> & string];

/**
 * Resolves the value type located at dot-notation path `P` within `T`.
 * Arrays encountered along the path are unwrapped to their element type,
 * mirroring {@link FieldPath}'s traversal rules. `null`/`undefined` are
 * stripped from the resolved type — nullability is queried explicitly via
 * the `isNull`/`isNotNull` operators rather than propagated into every
 * downstream comparison.
 *
 * @example
 * ```ts
 * type Total = FieldPathValue<User, "orders.total">; // number
 * type Name = FieldPathValue<User, "profile.company.name">; // string
 * ```
 */
export type FieldPathValue<T, P extends string> = P extends `${infer Head}.${infer Rest}`
  ? Head extends keyof NonNull<T>
    ? FieldPathValue<UnwrapArray<NonNull<NonNull<T>[Head]>>, Rest>
    : never
  : P extends keyof NonNull<T>
    ? NonNull<NonNull<T>[P]>
    : never;
