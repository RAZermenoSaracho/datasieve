import type { FieldPath } from "../fields/field-path.js";
import type { WhereInput } from "../filter/where.js";

/**
 * Grouping input: which fields to group by, and an optional filter over
 * the grouped results (analogous to SQL's `HAVING`, without naming SQL).
 *
 * Design note: DSQL reserves and types this shape now so the public API
 * and AST never need a breaking change to support it, but adapters are
 * not required to implement grouping yet — see `CLAUDE.md`'s phased
 * rollout. `having` currently reuses `WhereInput<T>` for simplicity; a
 * future revision may introduce a dedicated `HavingInput` that can also
 * reference aggregation aliases (e.g. filtering on a computed `total`).
 *
 * @example
 * ```ts
 * const groupBy: GroupByInput<Order> = { fields: ["customerId", "status"] };
 * ```
 */
export interface GroupByInput<T> {
  fields: FieldPath<T>[];
  having?: WhereInput<T>;
}
