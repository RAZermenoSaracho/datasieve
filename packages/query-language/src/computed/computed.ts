/**
 * Reserved extension point for computed/virtual fields — values derived
 * at query time (e.g. a `fullName` composed from `firstName`/`lastName`,
 * or a `distanceFromUser` computed from geo-coordinates) that don't exist
 * as a stored field on `T` but should still be selectable, sortable, and
 * filterable like any other field.
 *
 * This is deliberately underspecified for now: fully wiring virtual
 * fields into `FieldPath`, `SelectInput`, `SortInput`, etc. would mean
 * every one of those types needs a second type parameter for "extra
 * fields," which is a meaningful expansion of the type surface. Rather
 * than guess at that shape prematurely, this module only reserves the
 * concept — both in the public API (`DataSieveQuery.computed`) and the
 * AST (`ast/nodes.ts`'s future `computed` node) — so a later revision can
 * flesh it out without a breaking change to unrelated types.
 *
 * @example
 * ```ts
 * // Illustrative only — args/expression shape is intentionally open.
 * const computed: ComputedFieldsInput = {
 *   fullName: { expression: "concat", args: ["firstName", "lastName"] },
 * };
 * ```
 */
export interface ComputedFieldDefinition {
  /** Adapter-specific expression identifier (e.g. `"concat"`, `"distance"`). */
  expression: string;
  /** Arguments to the expression. Left as `unknown[]` pending a fuller design. */
  args?: unknown[];
}

/** A map of virtual field name to its computation, keyed by the alias it's exposed under. */
export type ComputedFieldsInput = Record<string, ComputedFieldDefinition>;
