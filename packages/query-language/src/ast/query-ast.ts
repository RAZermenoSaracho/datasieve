import type {
  AggregationNode,
  FilterNode,
  GroupingNode,
  PaginationNode,
  RelationNode,
  SearchNode,
  SelectionNode,
  SortNode,
} from "./nodes.js";

/**
 * The normalized internal representation of a `DataSieveQuery<T>`.
 *
 * This is the contract between the Core and every adapter (per
 * `CLAUDE.md`'s "Golden Rules": the Core owns the language, adapters
 * translate it). Adapters are written against `QueryAST`, never against
 * `DataSieveQuery<T>` directly — that keeps adapters free of generics and
 * decoupled from any particular application's domain types.
 *
 * Produced by {@link normalizeQuery}. Every field is present (using
 * `null`/empty-array as the "not requested" value) rather than optional,
 * so adapters can pattern-match without repeated `?.`/`??` handling.
 */
export interface QueryAST {
  filter: FilterNode | null;
  search: SearchNode | null;
  sort: SortNode[];
  pagination: PaginationNode | null;
  selection: SelectionNode | null;
  relations: RelationNode[];
  distinct: string[] | boolean | null;
  grouping: GroupingNode | null;
  aggregations: AggregationNode[];
}
