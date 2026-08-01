import type { AggregationFunction } from "../aggregation/aggregation.js";
import type {
  AggregationNode,
  ConditionNode,
  FilterNode,
  GroupingNode,
  RelationNode,
  SearchNode,
  SelectionNode,
  SortNode,
} from "../ast/nodes.js";
import type { QueryAST } from "../ast/query-ast.js";
import type { Operator } from "../operators/operator-types.js";
import type { PaginationInput } from "../pagination/pagination.js";
import type { DataSieveQuery } from "../query/query.js";
import type { SearchMode } from "../search/search.js";
import type { NullsPosition, SortDirection } from "../sort/sort.js";

/**
 * Normalizes a public, `T`-generic {@link DataSieveQuery} into the
 * internal, string-keyed {@link QueryAST} that adapters consume.
 *
 * This is the one-way bridge described in `CLAUDE.md`'s "Internal Query
 * Language" section: the public API exists for compile-time DX, the AST
 * exists for adapters to pattern-match at runtime without ever knowing
 * about `T`. Because `T`'s structure is erased at runtime, this function
 * necessarily treats field paths as plain strings — the compile-time
 * guarantees from `FieldPath<T>`/`Condition<T>` have already done their
 * job by the time a value reaches here. The single cast to
 * {@link AnyDataSieveQuery} below is that generic-erasure boundary, made
 * explicit and contained in one place rather than scattered throughout.
 *
 * `where`/`search`/`sort`/`pagination`/`select`/`include`/`distinct`/
 * `groupBy`/`aggregations` are fully normalized. `computed` is
 * intentionally not yet represented in {@link QueryAST} — see
 * `computed/computed.ts` for why that extension point is still open.
 *
 * @example
 * ```ts
 * const ast = normalizeQuery<User>({
 *   where: { field: "status", op: "=", value: "ACTIVE" },
 *   sort: [{ field: "createdAt", direction: "desc" }],
 * });
 * // ast.filter -> { type: "condition", field: "status", op: "=", value: "ACTIVE" }
 * // ast.sort -> [{ field: "createdAt", direction: "desc" }]
 * ```
 */
export function normalizeQuery<T>(query: DataSieveQuery<T>): QueryAST {
  const q = query as unknown as AnyDataSieveQuery;
  return {
    filter: q.where ? normalizeWhere(q.where) : null,
    search: q.search ? normalizeSearch(q.search) : null,
    sort: q.sort ? q.sort.map(normalizeSortField) : [],
    pagination: q.pagination ?? null,
    selection: q.select ? normalizeSelect(q.select) : null,
    relations: q.include ? normalizeInclude(q.include) : [],
    distinct: normalizeDistinct(q.distinct),
    grouping: q.groupBy ? normalizeGroupBy(q.groupBy) : null,
    aggregations: q.aggregations ? q.aggregations.map(normalizeAggregation) : [],
  };
}

/**
 * Structural, generic-erased mirrors of the public input types. DSQL's
 * public types are indexed by `FieldPath<T>`, which only exists at
 * compile time — at runtime every field path is just a `string`. These
 * types (and the single cast in `normalizeQuery`'s body) are the
 * intended generic-erasure boundary between the typed public API and the
 * untyped internal AST; nothing below this point needs or uses `T`.
 */
interface AnyDataSieveQuery {
  where?: AnyWhereInput;
  search?: AnySearchInput;
  sort?: AnySortField[];
  pagination?: PaginationInput;
  select?: AnySelectInput;
  include?: AnyIncludeInput;
  distinct?: string[] | boolean;
  groupBy?: AnyGroupByInput;
  aggregations?: AnyAggregationInput[];
}

type AnyCondition = { field: string; op: Operator; value?: unknown };
type AnyWhereInput = { and: AnyWhereInput[] } | { or: AnyWhereInput[] } | { not: AnyWhereInput } | AnyCondition;
type AnySearchInput = { value: string; mode?: SearchMode; fields: string[]; caseSensitive?: boolean };
type AnySortField = { field: string; direction: SortDirection; nulls?: NullsPosition };
type AnySelectInput = Record<string, boolean | undefined>;
type AnyRelationOptions = {
  where?: AnyWhereInput;
  select?: AnySelectInput;
  include?: AnyIncludeInput;
  sort?: AnySortField[];
};
type AnyIncludeInput = Record<string, boolean | AnyRelationOptions | undefined>;
type AnyGroupByInput = { fields: string[]; having?: AnyWhereInput };
type AnyAggregationInput = { fn: AggregationFunction; field?: string; alias: string };

function normalizeWhere(where: AnyWhereInput): FilterNode {
  if ("and" in where) {
    return { type: "and", nodes: where.and.map(normalizeWhere) };
  }
  if ("or" in where) {
    return { type: "or", nodes: where.or.map(normalizeWhere) };
  }
  if ("not" in where) {
    return { type: "not", node: normalizeWhere(where.not) };
  }
  return normalizeCondition(where);
}

function normalizeCondition(condition: AnyCondition): ConditionNode {
  if ("value" in condition) {
    return { type: "condition", field: condition.field, op: condition.op, value: condition.value };
  }
  return { type: "condition", field: condition.field, op: condition.op };
}

function normalizeSearch(search: AnySearchInput): SearchNode {
  return {
    value: search.value,
    mode: search.mode ?? "contains",
    fields: search.fields,
    caseSensitive: search.caseSensitive ?? false,
  };
}

function normalizeSortField(sort: AnySortField): SortNode {
  return sort.nulls
    ? { field: sort.field, direction: sort.direction, nulls: sort.nulls }
    : { field: sort.field, direction: sort.direction };
}

function normalizeSelect(select: AnySelectInput): SelectionNode {
  return { fields: Object.keys(select).filter((field) => select[field] === true) };
}

function normalizeInclude(include: AnyIncludeInput): RelationNode[] {
  const relations: RelationNode[] = [];
  for (const [field, options] of Object.entries(include)) {
    if (!options) continue;
    if (options === true) {
      relations.push({ field, filter: null, selection: null, sort: [], relations: [] });
      continue;
    }
    relations.push({
      field,
      filter: options.where ? normalizeWhere(options.where) : null,
      selection: options.select ? normalizeSelect(options.select) : null,
      sort: options.sort ? options.sort.map(normalizeSortField) : [],
      relations: options.include ? normalizeInclude(options.include) : [],
    });
  }
  return relations;
}

function normalizeDistinct(distinct: string[] | boolean | undefined): string[] | boolean | null {
  if (distinct === undefined) return null;
  return distinct;
}

function normalizeGroupBy(groupBy: AnyGroupByInput): GroupingNode {
  return {
    fields: groupBy.fields,
    having: groupBy.having ? normalizeWhere(groupBy.having) : null,
  };
}

function normalizeAggregation(aggregation: AnyAggregationInput): AggregationNode {
  return aggregation.field !== undefined
    ? { fn: aggregation.fn, field: aggregation.field, alias: aggregation.alias }
    : { fn: aggregation.fn, alias: aggregation.alias };
}
