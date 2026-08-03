import type {
  ConditionNode,
  FilterNode,
  Operator,
  PaginationNode,
  QueryAST,
  SearchNode,
  SelectionNode,
  SortNode,
} from "@razsdev/datasieve-query-language";
import type { AdapterExecuteResult, DataSieveAdapter } from "../adapter/adapter.js";

/** Options accepted by {@link createMemoryAdapter}. */
export interface MemoryAdapterOptions {
  /** Adapter name reported in {@link DataSieveExecutionError} messages. Defaults to `"memory"`. */
  name?: string;
}

/**
 * A reference `DataSieveAdapter` that interprets a {@link QueryAST}
 * directly against a plain in-memory array — no database involved.
 *
 * This exists for two reasons: it is what proves `@razsdev/datasieve-core`'s
 * pipeline and adapter contract work end to end without requiring a real
 * adapter (see the roadmap's Milestone 2 exit criteria), and it is a
 * genuinely useful tool for testing DataSieve-powered application code
 * without standing up a database.
 *
 * **Scope.** Filtering, and/or/not, search, multi-key sort (including
 * dot paths into nested *objects*), `select`, and both pagination modes
 * are fully interpreted. Three things are deliberately out of scope:
 *
 * - Dot paths through array relations (e.g. `"orders.total"`) resolve to
 *   `undefined` rather than guessing "any" vs. "every" semantics —
 *   deciding that is an adapter-specific concern (SQL `EXISTS`, Mongo
 *   `$elemMatch`, Prisma `some`/`every`/`none`), not something a
 *   reference adapter should silently pick on everyone's behalf.
 * - `include`/`groupBy`/`aggregations` are not executed — relations
 *   require an adapter that understands how to join, and
 *   grouping/aggregation execution remains a reserved, adapter-level
 *   concern per `@razsdev/datasieve-query-language`'s own milestone.
 * - The reserved `childOf`/`parentOf` operators throw, since they are
 *   not yet interpreted anywhere in DataSieve.
 *
 * @example
 * ```ts
 * const engine = createDataSieve({ adapter: createMemoryAdapter<User>() });
 * const response = await engine.query<User>({
 *   resource: users, // a plain User[]
 *   query: { where: { field: "status", op: "=", value: "ACTIVE" } },
 * });
 * ```
 */
export function createMemoryAdapter<TRecord = Record<string, unknown>>(
  options: MemoryAdapterOptions = {},
): DataSieveAdapter<readonly TRecord[], TRecord> {
  return {
    name: options.name ?? "memory",
    async execute(ast, resource) {
      return interpretQuery(ast, resource);
    },
  };
}

function interpretQuery<TRecord>(ast: QueryAST, resource: readonly TRecord[]): AdapterExecuteResult<TRecord> {
  const matched = resource.filter(
    (record) => evaluateFilter(record, ast.filter) && evaluateSearch(record, ast.search),
  );
  const sorted = applySort(matched, ast.sort);
  const pagination = ast.pagination ?? { kind: "offset" as const, page: 1, pageSize: Math.max(sorted.length, 1) };
  const paged = paginate(sorted, pagination);

  return {
    ...paged,
    data: ast.selection ? (paged.data.map((record) => applySelection(record, ast.selection)) as TRecord[]) : paged.data,
  };
}

// -- filtering ----------------------------------------------------------

function evaluateFilter(record: unknown, filter: FilterNode | null): boolean {
  if (!filter) return true;
  switch (filter.type) {
    case "and":
      return filter.nodes.every((node) => evaluateFilter(record, node));
    case "or":
      return filter.nodes.some((node) => evaluateFilter(record, node));
    case "not":
      return !evaluateFilter(record, filter.node);
    case "condition":
      return evaluateCondition(record, filter);
  }
}

function evaluateCondition(record: unknown, node: ConditionNode): boolean {
  const value = getByPath(record, node.field);
  return evaluateOperator(node.op, value, node.value);
}

function evaluateOperator(op: Operator, value: unknown, target: unknown): boolean {
  switch (op) {
    case "=":
      return value === target;
    case "!=":
      return value !== target;
    case ">":
      return compare(value, target) > 0;
    case ">=":
      return compare(value, target) >= 0;
    case "<":
      return compare(value, target) < 0;
    case "<=":
      return compare(value, target) <= 0;
    case "in":
      return Array.isArray(target) && target.includes(value);
    case "notIn":
      return Array.isArray(target) && !target.includes(value);
    case "like":
      return typeof value === "string" && typeof target === "string" && value.includes(target);
    case "ilike":
      return typeof value === "string" && typeof target === "string" && value.toLowerCase().includes(target.toLowerCase());
    case "contains":
      if (Array.isArray(value)) return value.includes(target);
      return typeof value === "string" && typeof target === "string" && value.includes(target);
    case "startsWith":
      return typeof value === "string" && typeof target === "string" && value.startsWith(target);
    case "endsWith":
      return typeof value === "string" && typeof target === "string" && value.endsWith(target);
    case "between": {
      if (!Array.isArray(target) || target.length !== 2) return false;
      const [min, max] = target;
      return compare(value, min) >= 0 && compare(value, max) <= 0;
    }
    case "isNull":
      return value === null || value === undefined;
    case "isNotNull":
      return value !== null && value !== undefined;
    case "exists":
      return Array.isArray(value) ? value.length > 0 : value !== null && value !== undefined;
    case "notExists":
      return Array.isArray(value) ? value.length === 0 : value === null || value === undefined;
    case "childOf":
    case "parentOf":
      throw new Error(`createMemoryAdapter does not support the reserved "${op}" operator.`);
  }
}

function compare(a: unknown, b: unknown): number {
  const av = toComparable(a);
  const bv = toComparable(b);
  if (av < bv) return -1;
  if (av > bv) return 1;
  return 0;
}

function toComparable(value: unknown): number | string {
  if (value instanceof Date) return value.getTime();
  if (typeof value === "number" || typeof value === "string") return value;
  return String(value);
}

// -- search ---------------------------------------------------------------

function evaluateSearch(record: unknown, search: SearchNode | null): boolean {
  if (!search) return true;
  const needle = search.caseSensitive ? search.value : search.value.toLowerCase();
  return search.fields.some((field) => {
    const raw = getByPath(record, field);
    if (typeof raw !== "string") return false;
    const haystack = search.caseSensitive ? raw : raw.toLowerCase();
    switch (search.mode) {
      case "startsWith":
        return haystack.startsWith(needle);
      case "endsWith":
        return haystack.endsWith(needle);
      case "exact":
        return haystack === needle;
      case "contains":
        return haystack.includes(needle);
    }
  });
}

// -- sorting ----------------------------------------------------------------

function applySort<TRecord>(records: readonly TRecord[], sort: readonly SortNode[]): TRecord[] {
  if (sort.length === 0) return [...records];
  return [...records].sort((a, b) => {
    for (const { field, direction, nulls } of sort) {
      const av = getByPath(a, field);
      const bv = getByPath(b, field);
      const aNull = av === null || av === undefined;
      const bNull = bv === null || bv === undefined;
      if (aNull || bNull) {
        if (aNull && bNull) continue;
        const nullsFirst = nulls === "first";
        if (aNull) return nullsFirst ? -1 : 1;
        return nullsFirst ? 1 : -1;
      }
      const cmp = compare(av, bv);
      if (cmp !== 0) return direction === "asc" ? cmp : -cmp;
    }
    return 0;
  });
}

// -- selection ----------------------------------------------------------------

function applySelection(record: unknown, selection: SelectionNode | null): unknown {
  if (!selection || selection.fields.length === 0 || typeof record !== "object" || record === null) {
    return record;
  }
  const projected: Record<string, unknown> = {};
  for (const field of selection.fields) {
    projected[field] = (record as Record<string, unknown>)[field];
  }
  return projected;
}

// -- pagination ----------------------------------------------------------------

function paginate<TRecord>(records: readonly TRecord[], pagination: PaginationNode): AdapterExecuteResult<TRecord> {
  const total = records.length;

  if (pagination.kind === "offset") {
    const start = (pagination.page - 1) * pagination.pageSize;
    return { data: records.slice(start, start + pagination.pageSize), total };
  }

  const { take, direction = "forward" } = pagination;

  if (direction === "forward") {
    const start = pagination.cursor !== undefined ? decodeCursor(pagination.cursor) : 0;
    const data = records.slice(start, start + take);
    const end = start + data.length;
    return {
      data,
      total,
      nextCursor: end < total ? encodeCursor(end) : null,
      previousCursor: start > 0 ? encodeCursor(Math.max(0, start - take)) : null,
    };
  }

  const end = pagination.cursor !== undefined ? decodeCursor(pagination.cursor) : total;
  const start = Math.max(0, end - take);
  return {
    data: records.slice(start, end),
    total,
    nextCursor: end < total ? encodeCursor(end) : null,
    previousCursor: start > 0 ? encodeCursor(start) : null,
  };
}

function encodeCursor(offset: number): string {
  return String(offset);
}

function decodeCursor(cursor: string): number {
  const value = Number(cursor);
  return Number.isFinite(value) && value >= 0 ? value : 0;
}

// -- field paths ----------------------------------------------------------------

function getByPath(record: unknown, path: string): unknown {
  let current: unknown = record;
  for (const segment of path.split(".")) {
    if (current === null || typeof current !== "object" || Array.isArray(current)) {
      return undefined;
    }
    current = (current as Record<string, unknown>)[segment];
  }
  return current;
}
