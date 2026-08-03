import type { AggregationNode, GroupingNode } from "@datasieve/query-language";
import type { TranslateOptions } from "./options.js";
import { translateFilter } from "./where.js";

/** Prisma `groupBy` arguments covering grouping/aggregation only (`by`/`having`/the `_count` etc. selectors). */
export interface GroupByTranslation {
  by: string[];
  having?: Record<string, unknown>;
  aggregateSelectors: Record<string, Record<string, boolean>>;
}

/**
 * Translates DSQL's `grouping`/`aggregations` into Prisma `groupBy`
 * arguments. `aggregateSelectors` becomes the `_count`/`_sum`/`_avg`/
 * `_min`/`_max` selection objects `groupBy` expects (e.g.
 * `{ _sum: { total: true } }`); a bare `count` (no `field`) becomes
 * `_count: { _all: true }`.
 *
 * **Known limitation:** `having` is translated with the same
 * `translateFilter` used for `where`, which correctly supports
 * conditions on *grouped* fields (e.g. `{ field: "status", op: "=", ... }`)
 * but not conditions on *aggregated* values (Prisma requires those
 * wrapped as `{ total: { _sum: { gt: 1000 } } }`, keyed by aggregation
 * alias). Resolving that needs `having` to reference aggregation aliases,
 * which `GroupByInput.having` doesn't yet support — see its TSDoc in
 * `@datasieve/query-language` for why this was deliberately left as a
 * future refinement rather than solved here.
 */
export function translateGrouping(
  grouping: GroupingNode,
  aggregations: readonly AggregationNode[],
  options: TranslateOptions,
): GroupByTranslation {
  const aggregateSelectors: Record<string, Record<string, boolean>> = {};
  for (const aggregation of aggregations) {
    const key = `_${aggregation.fn}`;
    const selector = (aggregateSelectors[key] ??= {});
    if (aggregation.field) {
      selector[aggregation.field] = true;
    } else {
      selector._all = true;
    }
  }

  const having = grouping.having ? translateFilter(grouping.having, options) : undefined;
  return having === undefined
    ? { by: grouping.fields, aggregateSelectors }
    : { by: grouping.fields, having, aggregateSelectors };
}

/**
 * Flattens one Prisma `groupBy` result row — `{ status: "PAID", _sum:
 * { total: 500 }, _count: { _all: 3 } }` — into the alias-keyed shape
 * DSQL's {@link AggregationNode}s promise: `{ status: "PAID", revenue:
 * 500, orderCount: 3 }`.
 */
export function reshapeGroupByRow(row: Record<string, unknown>, aggregations: readonly AggregationNode[]): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    if (!key.startsWith("_")) {
      result[key] = value;
    }
  }
  for (const aggregation of aggregations) {
    const bucket = row[`_${aggregation.fn}`] as Record<string, unknown> | undefined;
    if (!bucket) continue;
    const field = aggregation.field ?? "_all";
    result[aggregation.alias] = bucket[field];
  }
  return result;
}
