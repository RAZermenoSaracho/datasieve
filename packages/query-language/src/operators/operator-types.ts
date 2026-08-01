/**
 * Type-level operator catalog: which operators exist, which are valid for
 * a given field's value type, and what shape the `value` of a condition
 * takes for a given operator.
 *
 * This is the file to touch when adding a new operator. Three steps:
 *
 * 1. Add the literal to the relevant group below (or a new group).
 * 2. If it needs a non-default value shape, add a branch to {@link OperatorValue}.
 * 3. Register runtime metadata for it in `operators.ts`.
 *
 * No other file in this package needs to change — {@link Operator},
 * {@link OperatorsFor}, and `Condition<T>` (in `filter/condition.ts`) all
 * derive from these definitions.
 */

/** `field <op> value` comparisons. */
export type ComparisonOperator = "=" | "!=" | ">" | ">=" | "<" | "<=";

/** Membership tests against a list of values. */
export type ListOperator = "in" | "notIn";

/** Pattern-matching operators, valid on string-like fields only. */
export type StringMatchOperator = "like" | "ilike" | "contains" | "startsWith" | "endsWith";

/** Inclusive two-sided range test. */
export type RangeOperator = "between";

/** Nullability tests. Never take a `value`. */
export type NullOperator = "isNull" | "isNotNull";

/**
 * Relation/collection presence tests (e.g. "has at least one order"),
 * distinct from {@link NullOperator} which tests scalar nullability.
 * Never take a `value`.
 */
export type ExistenceOperator = "exists" | "notExists";

/**
 * Hierarchical traversal operators, directly inspired by Odoo's
 * `child_of`/`parent_of`. Reserved for future support of tree-shaped
 * relations (e.g. category trees); accepted by the type system today but
 * not yet interpreted by {@link normalizeQuery}.
 */
export type HierarchyOperator = "childOf" | "parentOf";

/** The full set of operators DSQL recognizes today. */
export type Operator =
  | ComparisonOperator
  | ListOperator
  | StringMatchOperator
  | RangeOperator
  | NullOperator
  | ExistenceOperator
  | HierarchyOperator;

/** Operators whose condition shape never includes a `value` property. */
export type NoValueOperator = NullOperator | ExistenceOperator;

type EqualityOps = "=" | "!=";
type ReservedOps = HierarchyOperator;
type NullableOps = NullOperator | ExistenceOperator;

/** Operators valid on every field, regardless of value type. */
type GenericOperators = EqualityOps | NullableOps | ReservedOps;

/** {@link GenericOperators} plus ordering/range comparisons. */
type OrderedOperators = GenericOperators | ">" | ">=" | "<" | "<=" | RangeOperator;

/** Operators valid on `string` fields. */
export type StringOperators = GenericOperators | StringMatchOperator | ListOperator;

/** Operators valid on `number`/`bigint` fields. */
export type NumberOperators = OrderedOperators | ListOperator;

/** Operators valid on `boolean` fields. */
export type BooleanOperators = GenericOperators;

/** Operators valid on `Date` fields. */
export type DateOperators = OrderedOperators | ListOperator;

/** Operators valid on array/collection fields (element membership, presence). */
export type ArrayOperators = "contains" | ListOperator | NullableOps;

/** Operators valid on object/relation leaf fields (presence checks only). */
export type ObjectOperators = NullableOps | ReservedOps;

/**
 * Resolves the set of operators applicable to a field whose value type is
 * `V`. Drives both the `op` autocomplete and the `value` type of a
 * {@link Condition} for that field.
 */
export type OperatorsFor<V> = V extends string
  ? StringOperators
  : V extends number | bigint
    ? NumberOperators
    : V extends boolean
      ? BooleanOperators
      : V extends Date
        ? DateOperators
        : V extends ReadonlyArray<unknown>
          ? ArrayOperators
          : ObjectOperators;

/**
 * Resolves the `value` type of a condition for operator `Op` against a
 * field whose value type is `V`. Operators in {@link NoValueOperator} are
 * handled separately (their condition shape omits `value` entirely).
 */
export type OperatorValue<Op extends Operator, V> = Op extends ListOperator
  ? readonly V[]
  : Op extends RangeOperator
    ? readonly [V, V]
    : Op extends "contains"
      ? V extends ReadonlyArray<infer E>
        ? E
        : string
      : V;
