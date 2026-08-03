import type { Operator } from "./operator-types.js";

/**
 * Shape/arity of an operator's `value`, independent of any adapter.
 * Adapters use this to decide how to translate a condition without
 * needing to special-case operator names.
 */
export type OperatorArity =
  /** No `value` (e.g. `isNull`). */
  | "none"
  /** A single scalar `value` (e.g. `=`). */
  | "unary"
  /** A list `value` (e.g. `in`). */
  | "list"
  /** A fixed two-element tuple `value` (e.g. `between`). */
  | "range";

/** Runtime metadata describing one DSQL operator. */
export interface OperatorDefinition {
  /** The canonical operator name, as used in `Condition.op`. */
  readonly name: Operator;
  /** Shape of the `value` this operator expects. */
  readonly arity: OperatorArity;
  /** Human-readable description, primarily for docs/tooling. */
  readonly description: string;
  /**
   * `true` if the operator is reserved for future use and not yet
   * interpreted during normalization (currently: `childOf`/`parentOf`).
   */
  readonly reserved?: true;
}

/**
 * Runtime registry of every operator DSQL recognizes, keyed by name.
 * This is the single source of truth adapters and tooling should consult
 * to introspect operator behavior (arity, description) — it mirrors, but
 * is independent of, the compile-time rules in `operator-types.ts`.
 *
 * @example
 * ```ts
 * import { OPERATORS } from "@razsdev/datasieve-query-language";
 *
 * OPERATORS["between"].arity; // "range"
 * ```
 */
export const OPERATORS: Readonly<Record<Operator, OperatorDefinition>> = {
  "=": { name: "=", arity: "unary", description: "Field equals value." },
  "!=": { name: "!=", arity: "unary", description: "Field does not equal value." },
  ">": { name: ">", arity: "unary", description: "Field is greater than value." },
  ">=": { name: ">=", arity: "unary", description: "Field is greater than or equal to value." },
  "<": { name: "<", arity: "unary", description: "Field is less than value." },
  "<=": { name: "<=", arity: "unary", description: "Field is less than or equal to value." },
  in: { name: "in", arity: "list", description: "Field's value is one of the given values." },
  notIn: { name: "notIn", arity: "list", description: "Field's value is none of the given values." },
  like: { name: "like", arity: "unary", description: "Case-sensitive pattern match." },
  ilike: { name: "ilike", arity: "unary", description: "Case-insensitive pattern match." },
  contains: {
    name: "contains",
    arity: "unary",
    description: "String contains substring, or array/collection contains element.",
  },
  startsWith: { name: "startsWith", arity: "unary", description: "String starts with value." },
  endsWith: { name: "endsWith", arity: "unary", description: "String ends with value." },
  between: { name: "between", arity: "range", description: "Field's value is within an inclusive [min, max] range." },
  isNull: { name: "isNull", arity: "none", description: "Field's value is null." },
  isNotNull: { name: "isNotNull", arity: "none", description: "Field's value is not null." },
  exists: { name: "exists", arity: "none", description: "Relation/collection has at least one related record." },
  notExists: { name: "notExists", arity: "none", description: "Relation/collection has no related records." },
  childOf: {
    name: "childOf",
    arity: "unary",
    description: "Record is a descendant of the given value within a hierarchical relation.",
    reserved: true,
  },
  parentOf: {
    name: "parentOf",
    arity: "unary",
    description: "Record is an ancestor of the given value within a hierarchical relation.",
    reserved: true,
  },
};

/** All operator names, derived from {@link OPERATORS}. */
export const OPERATOR_NAMES = Object.keys(OPERATORS) as Operator[];
