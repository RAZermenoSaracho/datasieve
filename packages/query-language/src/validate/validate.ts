import type { DataSieveIssue } from "../errors/errors.js";
import type { DataSieveQuery } from "../query/query.js";

/** Result of {@link validateQuery}. */
export type ValidationResult = { valid: true } | { valid: false; issues: DataSieveIssue[] };

/**
 * Validates a well-formed {@link DataSieveQuery} for internal
 * consistency — constraints TypeScript's structural typing can't fully
 * enforce on its own, and that matter regardless of which adapter
 * eventually executes the query.
 *
 * This is a **skeleton**: it covers a handful of representative,
 * genuinely useful checks (e.g. a `between` condition must carry exactly
 * two values, `pagination.pageSize` must be positive) rather than a
 * complete rule set. It is also intentionally **schema-free** — it never
 * checks that a field path actually exists on `T` or that a value's
 * runtime type matches the field, since that requires knowledge of `T`'s
 * shape (and, per `CLAUDE.md`, that kind of runtime schema validation is
 * planned as a separate plugin, e.g. Zod-backed, layered on top of this
 * package rather than baked into it). Extend `validateWhere` and friends
 * below as new structural rules are identified.
 *
 * @example
 * ```ts
 * const result = validateQuery(query);
 * if (!result.valid) {
 *   throw new QueryValidationError("Invalid query", result.issues);
 * }
 * ```
 */
export function validateQuery<T>(query: DataSieveQuery<T>): ValidationResult {
  const issues: DataSieveIssue[] = [];

  if (query.where) validateWhere(query.where as AnyWhereInput, "where", issues);
  if (query.search) validateSearch(query.search as AnySearchInput, issues);
  if (query.pagination) validatePagination(query.pagination, issues);
  if (query.groupBy) validateGroupBy(query.groupBy as AnyGroupByInput, issues);
  for (const [index, aggregation] of (query.aggregations ?? []).entries()) {
    validateAggregation(aggregation as AnyAggregationInput, index, issues);
  }

  return issues.length === 0 ? { valid: true } : { valid: false, issues };
}

type AnyCondition = { field: string; op: string; value?: unknown };
type AnyWhereInput = { and: AnyWhereInput[] } | { or: AnyWhereInput[] } | { not: AnyWhereInput } | AnyCondition;
type AnySearchInput = { value: string; fields: string[] };
type AnyGroupByInput = { fields: string[]; having?: AnyWhereInput };
type AnyAggregationInput = { fn: string; field?: string; alias: string };

function validateWhere(where: AnyWhereInput, path: string, issues: DataSieveIssue[]): void {
  if ("and" in where) {
    if (where.and.length === 0) {
      issues.push({ path, message: "`and` must contain at least one condition.", code: "EMPTY_AND" });
    }
    where.and.forEach((child, index) => validateWhere(child, `${path}.and.${index}`, issues));
    return;
  }
  if ("or" in where) {
    if (where.or.length === 0) {
      issues.push({ path, message: "`or` must contain at least one condition.", code: "EMPTY_OR" });
    }
    where.or.forEach((child, index) => validateWhere(child, `${path}.or.${index}`, issues));
    return;
  }
  if ("not" in where) {
    validateWhere(where.not, `${path}.not`, issues);
    return;
  }
  validateCondition(where, path, issues);
}

function validateCondition(condition: AnyCondition, path: string, issues: DataSieveIssue[]): void {
  if (condition.op === "between") {
    const value = condition.value;
    if (!Array.isArray(value) || value.length !== 2) {
      issues.push({
        path: `${path}.value`,
        message: '"between" requires a value of exactly two elements: [min, max].',
        code: "INVALID_BETWEEN_VALUE",
      });
    }
  }
  if (condition.op === "in" || condition.op === "notIn") {
    if (!Array.isArray(condition.value)) {
      issues.push({
        path: `${path}.value`,
        message: `"${condition.op}" requires an array value.`,
        code: "INVALID_LIST_VALUE",
      });
    }
  }
}

function validateSearch(search: AnySearchInput, issues: DataSieveIssue[]): void {
  if (search.fields.length === 0) {
    issues.push({ path: "search.fields", message: "`search.fields` must not be empty.", code: "EMPTY_SEARCH_FIELDS" });
  }
}

function validatePagination(pagination: { kind: string; page?: number; pageSize?: number; take?: number }, issues: DataSieveIssue[]): void {
  if (pagination.kind === "offset") {
    if (typeof pagination.page === "number" && pagination.page < 1) {
      issues.push({ path: "pagination.page", message: "`page` must be >= 1.", code: "INVALID_PAGE" });
    }
    if (typeof pagination.pageSize === "number" && pagination.pageSize < 1) {
      issues.push({ path: "pagination.pageSize", message: "`pageSize` must be >= 1.", code: "INVALID_PAGE_SIZE" });
    }
  }
  if (pagination.kind === "cursor" && typeof pagination.take === "number" && pagination.take < 1) {
    issues.push({ path: "pagination.take", message: "`take` must be >= 1.", code: "INVALID_TAKE" });
  }
}

function validateGroupBy(groupBy: AnyGroupByInput, issues: DataSieveIssue[]): void {
  if (groupBy.fields.length === 0) {
    issues.push({ path: "groupBy.fields", message: "`groupBy.fields` must not be empty.", code: "EMPTY_GROUP_BY" });
  }
  if (groupBy.having) {
    validateWhere(groupBy.having, "groupBy.having", issues);
  }
}

function validateAggregation(aggregation: AnyAggregationInput, index: number, issues: DataSieveIssue[]): void {
  const path = `aggregations.${index}`;
  if (!aggregation.alias) {
    issues.push({ path: `${path}.alias`, message: "Aggregation `alias` must not be empty.", code: "MISSING_ALIAS" });
  }
  if (aggregation.fn !== "count" && !aggregation.field) {
    issues.push({
      path: `${path}.field`,
      message: `"${aggregation.fn}" requires a \`field\`.`,
      code: "MISSING_AGGREGATION_FIELD",
    });
  }
}
