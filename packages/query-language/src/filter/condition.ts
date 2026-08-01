import type { FieldPath, FieldPathValue } from "../fields/field-path.js";
import type { NoValueOperator, Operator, OperatorsFor, OperatorValue } from "../operators/operator-types.js";

/**
 * Builds the union of valid condition shapes for a single field path `P`
 * whose resolved value type is `V`. Only operators applicable to `V` (per
 * {@link OperatorsFor}) are included, and operators in
 * {@link NoValueOperator} omit `value` entirely rather than requiring
 * `value: undefined`.
 */
export type ConditionForField<P extends string, V> = {
  [Op in OperatorsFor<V>]: Op extends NoValueOperator
    ? { field: P; op: Op }
    : { field: P; op: Op; value: OperatorValue<Op, V> };
}[OperatorsFor<V>];

/**
 * A single leaf condition in a {@link WhereInput} tree: a field path, an
 * operator valid for that field's type, and (for most operators) a value
 * of the matching shape.
 *
 * `field` drives autocomplete over every valid dot-notation path on `T`
 * (see {@link FieldPath}); once a field is chosen, `op` is narrowed to the
 * operators valid for that field's type, and `value` is narrowed to match.
 *
 * @example
 * ```ts
 * const c1: Condition<User> = { field: "status", op: "=", value: "ACTIVE" };
 * const c2: Condition<User> = { field: "orders.total", op: "between", value: [100, 500] };
 * const c3: Condition<User> = { field: "profile", op: "isNotNull" };
 *
 * // @ts-expect-error "startsWith" is not valid for a number field
 * const bad: Condition<User> = { field: "age", op: "startsWith", value: "3" };
 * ```
 */
export type Condition<T> = {
  [P in FieldPath<T>]: ConditionForField<P, FieldPathValue<T, P>>;
}[FieldPath<T>];

/** Re-exported for convenience so consumers rarely need to import from `operators/`. */
export type { Operator };
