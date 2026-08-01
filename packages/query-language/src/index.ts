/**
 * @packageDocumentation
 *
 * DSQL — the DataSieve Query Language.
 *
 * This package is the public, database-agnostic language every DataSieve
 * application writes and every adapter (Prisma, Drizzle, MongoDB, SQL,
 * Elasticsearch, ...) consumes. It contains **only the language**: types,
 * operator definitions, and skeleton parse/normalize/validate functions —
 * no adapters, no execution.
 *
 * Start with {@link DataSieveQuery}, the root type. Everything else in
 * this package exists to make that type precisely inferred and safe to
 * author by hand.
 */

// Fields
export type { FieldPath, FieldPathValue } from "./fields/field-path.js";

// Operators
export type {
  ArrayOperators,
  BooleanOperators,
  ComparisonOperator,
  DateOperators,
  ExistenceOperator,
  HierarchyOperator,
  ListOperator,
  NoValueOperator,
  NumberOperators,
  ObjectOperators,
  Operator,
  OperatorValue,
  OperatorsFor,
  RangeOperator,
  StringMatchOperator,
  StringOperators,
} from "./operators/operator-types.js";
export { OPERATOR_NAMES, OPERATORS } from "./operators/operators.js";
export type { OperatorArity, OperatorDefinition } from "./operators/operators.js";

// Filtering
export type { Condition, ConditionForField } from "./filter/condition.js";
export type { AndInput, NotInput, OrInput, WhereInput } from "./filter/where.js";

// Search
export type { SearchInput, SearchMode, SearchableFieldPath } from "./search/search.js";

// Sorting
export type { NullsPosition, SortDirection, SortField, SortInput } from "./sort/sort.js";

// Pagination
export type { CursorPagination, OffsetPagination, PaginationInput } from "./pagination/pagination.js";

// Selection & relations
export type { ScalarKeys, SelectInput } from "./selection/select.js";
export type { IncludeInput, RelationIncludeOptions, RelationKeys } from "./selection/include.js";

// Grouping & aggregation
export type { GroupByInput } from "./grouping/group-by.js";
export type { AggregationFunction, AggregationInput, CountAggregation, FieldAggregation } from "./aggregation/aggregation.js";

// Computed fields (reserved extension point)
export type { ComputedFieldDefinition, ComputedFieldsInput } from "./computed/computed.js";

// Root query type
export type { DataSieveQuery } from "./query/query.js";

// Internal AST
export type {
  AggregationNode,
  AndNode,
  ConditionNode,
  FilterNode,
  GroupingNode,
  NotNode,
  OrNode,
  PaginationNode,
  RelationNode,
  SearchNode,
  SelectionNode,
  SortNode,
} from "./ast/nodes.js";
export type { QueryAST } from "./ast/query-ast.js";

// Pipeline: parse -> validate -> normalize
export { parseQuery } from "./parse/parse.js";
export type { ParseResult } from "./parse/parse.js";
export { validateQuery } from "./validate/validate.js";
export type { ValidationResult } from "./validate/validate.js";
export { normalizeQuery } from "./normalize/normalize.js";

// Errors
export { DataSieveError, ParseError, QueryValidationError } from "./errors/errors.js";
export type { DataSieveIssue } from "./errors/errors.js";
