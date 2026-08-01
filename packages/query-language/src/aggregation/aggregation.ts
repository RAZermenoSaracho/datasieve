import type { FieldPath } from "../fields/field-path.js";

/** Supported aggregate functions. */
export type AggregationFunction = "count" | "sum" | "avg" | "min" | "max";

/**
 * `count` aggregation. `field` is optional — omit it to count every
 * record (`count(*)`), or provide a field path to count non-null/distinct
 * occurrences of that field, adapter-dependent.
 */
export interface CountAggregation<T> {
  fn: "count";
  field?: FieldPath<T>;
  /** Name this aggregation's result will be exposed under. */
  alias: string;
}

/** `sum`/`avg`/`min`/`max` aggregation over a specific field. */
export interface FieldAggregation<T> {
  fn: Exclude<AggregationFunction, "count">;
  field: FieldPath<T>;
  /** Name this aggregation's result will be exposed under. */
  alias: string;
}

/**
 * A single aggregation to compute, typically alongside `groupBy`. The
 * AST reserves space for these today (see `ast/nodes.ts`); execution is
 * an adapter concern for a future phase.
 *
 * @example
 * ```ts
 * const aggregations: AggregationInput<Order>[] = [
 *   { fn: "count", alias: "orderCount" },
 *   { fn: "sum", field: "total", alias: "revenue" },
 * ];
 * ```
 */
export type AggregationInput<T> = CountAggregation<T> | FieldAggregation<T>;
