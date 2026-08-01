import type { DataSieveQuery } from "../query/query.js";
import type { DataSieveIssue } from "../errors/errors.js";

/** Result of {@link parseQuery}: either a typed query, or a list of issues explaining why parsing failed. */
export type ParseResult<T> = { success: true; data: DataSieveQuery<T> } | { success: false; issues: DataSieveIssue[] };

const KNOWN_TOP_LEVEL_KEYS = new Set([
  "where",
  "search",
  "sort",
  "pagination",
  "select",
  "include",
  "distinct",
  "groupBy",
  "aggregations",
  "computed",
]);

/**
 * Parses untrusted input (e.g. a JSON request body, deserialized URL
 * query parameters) into a {@link DataSieveQuery}.
 *
 * This is a **skeleton**: it confirms `raw` is a plain object and that
 * every top-level key is one DSQL recognizes, which is enough to catch
 * gross shape mistakes (e.g. a non-object payload, a typo'd top-level
 * key) early and cheaply. It deliberately does **not** walk into
 * `where`/`sort`/etc. to verify field paths exist on `T`, that operators
 * match value types, or that values have the right runtime shape —
 * `T`'s structure isn't available at runtime, so that level of checking
 * belongs to a schema-aware layer built on top of this package (e.g. a
 * future `validation` plugin, per `CLAUDE.md`), or to {@link validateQuery}
 * once it grows adapter/schema awareness.
 *
 * Only one wire format (a plain JS object shaped like `DataSieveQuery`)
 * is supported today. This function is the intended extension point for
 * others — e.g. parsing DSQL out of a URL query string or a compact
 * string grammar — without changing `DataSieveQuery` or `QueryAST`.
 *
 * @example
 * ```ts
 * const result = parseQuery<User>(JSON.parse(request.body));
 * if (!result.success) {
 *   return respondWithErrors(result.issues);
 * }
 * const ast = normalizeQuery(result.data);
 * ```
 */
export function parseQuery<T>(raw: unknown): ParseResult<T> {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return {
      success: false,
      issues: [{ path: "", message: "Query must be a plain object.", code: "INVALID_ROOT" }],
    };
  }

  const issues: DataSieveIssue[] = [];
  for (const key of Object.keys(raw)) {
    if (!KNOWN_TOP_LEVEL_KEYS.has(key)) {
      issues.push({ path: key, message: `Unknown query key "${key}".`, code: "UNKNOWN_KEY" });
    }
  }

  if (issues.length > 0) {
    return { success: false, issues };
  }

  return { success: true, data: raw as DataSieveQuery<T> };
}
