import type { AggregationFunction } from "../aggregation/aggregation.js";
import type { NullsPosition, SortDirection } from "../sort/sort.js";
import type { Operator } from "../operators/operator-types.js";
import type { SearchMode } from "../search/search.js";
import type { PaginationInput } from "../pagination/pagination.js";

/**
 * Internal AST node types. Unlike the public `DataSieveQuery<T>` API,
 * these are **not generic over `T`** — field paths are plain strings.
 *
 * This split is deliberate (see `CLAUDE.md`, "Internal Query Language"):
 * the public API's job is compile-time DX (autocomplete, inference,
 * catching invalid field/op/value combinations); the AST's job is to be
 * a small, stable, easy-to-pattern-match contract that adapters — which
 * have no idea what `T` is — can walk at runtime. `normalizeQuery`
 * (see `normalize/normalize.ts`) is the one-way bridge between the two.
 */

/** A single leaf condition, flattened to a plain string field path. */
export interface ConditionNode {
  type: "condition";
  field: string;
  op: Operator;
  /** Present unless `op` is a no-value operator (`isNull`, `exists`, etc). */
  value?: unknown;
}

/** Logical AND of child nodes. */
export interface AndNode {
  type: "and";
  nodes: FilterNode[];
}

/** Logical OR of child nodes. */
export interface OrNode {
  type: "or";
  nodes: FilterNode[];
}

/** Logical negation of a child node. */
export interface NotNode {
  type: "not";
  node: FilterNode;
}

/** A node in the normalized filter tree. Mirrors `WhereInput<T>` structurally. */
export type FilterNode = AndNode | OrNode | NotNode | ConditionNode;

/** Normalized free-text search. */
export interface SearchNode {
  value: string;
  mode: SearchMode;
  fields: string[];
  caseSensitive: boolean;
}

/** A single normalized sort instruction. */
export interface SortNode {
  field: string;
  direction: SortDirection;
  nulls?: NullsPosition;
}

/**
 * Pagination has no `T`-dependent parts in the public API already, so the
 * AST reuses {@link PaginationInput} directly rather than duplicating it.
 */
export type PaginationNode = PaginationInput;

/** Normalized scalar field selection. `null` means "no restriction — select everything." */
export interface SelectionNode {
  fields: string[];
}

/**
 * A normalized relation to include, recursively containing its own
 * filter/selection/sort/nested-relations — the AST equivalent of
 * `IncludeInput<T>`.
 */
export interface RelationNode {
  field: string;
  filter: FilterNode | null;
  selection: SelectionNode | null;
  sort: SortNode[];
  relations: RelationNode[];
}

/** Normalized grouping instruction. */
export interface GroupingNode {
  fields: string[];
  having: FilterNode | null;
}

/** A single normalized aggregation to compute. */
export interface AggregationNode {
  fn: AggregationFunction;
  field?: string;
  alias: string;
}
