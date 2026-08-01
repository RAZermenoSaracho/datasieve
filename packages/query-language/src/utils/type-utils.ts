/**
 * Shared, low-level type-level utilities used throughout DSQL.
 *
 * These are intentionally generic (not DSQL-specific) so they can be
 * reused by every other module without creating circular imports.
 */

/**
 * Values DSQL treats as "leaves" — types that terminate a field path and
 * can be filtered/sorted/searched directly, as opposed to objects whose
 * keys should be traversed further (see {@link FieldPath}).
 *
 * `Date` is intentionally included: structurally it is an object, but
 * semantically it behaves like a scalar for querying purposes.
 */
export type Primitive =
  | string
  | number
  | boolean
  | bigint
  | symbol
  | undefined
  | null
  | Date;

/**
 * Strips `null`/`undefined` from `T`. DSQL treats optional/nullable
 * fields the same as their non-nullable counterpart for path traversal
 * and operator selection — nullability is handled via `isNull`/`isNotNull`
 * rather than by widening every downstream type.
 */
export type NonNull<T> = T extends null | undefined ? never : T;

/**
 * Resolves the element type of `T` if `T` is an array, otherwise returns
 * `T` unchanged. Used so that a field like `orders: Order[]` can be
 * traversed as `"orders.total"` without the caller ever writing an index.
 */
export type UnwrapArray<T> = T extends ReadonlyArray<infer E> ? E : T;

/**
 * Structural test for whether a value type represents a "relation"
 * (an object, or an array/collection of objects) as opposed to a scalar
 * field. Dates are explicitly excluded — they are objects at runtime but
 * scalars for querying purposes. Arrays of primitives (e.g. `string[]`)
 * are also excluded; they are scalar collections, not relations.
 */
export type IsRelation<V> = NonNull<V> extends Date
  ? false
  : NonNull<V> extends ReadonlyArray<infer E>
    ? IsRelation<E>
    : NonNull<V> extends Primitive
      ? false
      : NonNull<V> extends object
        ? true
        : false;

/**
 * A countdown tuple used to bound recursive conditional types
 * (e.g. {@link FieldPath}, `IncludeInput`). Indexing `Prev[D]` yields
 * `D - 1`, and recursion stops once the index type resolves to `never`.
 *
 * Without an explicit depth bound, recursive types over self-referential
 * domain models (e.g. `User.manager: User`) would cause TypeScript to
 * report "Type instantiation is excessively deep and possibly infinite."
 */
export type Prev = [never, 0, 1, 2, 3, 4, 5, 6, 7];

/** Default recursion depth used across DSQL's recursive types. */
export type DefaultDepth = 5;
