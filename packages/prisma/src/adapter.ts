import type { AdapterExecuteResult, DataSieveAdapter } from "@razsdev/datasieve-core";
import type { QueryAST } from "@razsdev/datasieve-query-language";
import type { PrismaClientLike, PrismaModelDelegate } from "./delegate.js";
import { reshapeGroupByRow, translateGrouping } from "./translate/aggregate.js";
import type { TranslateOptions } from "./translate/options.js";
import { buildPaginationArgs, resolveCursorPage, type CursorOptions } from "./translate/pagination.js";
import { buildSelection } from "./translate/selection.js";
import { translateSearch } from "./translate/search.js";
import { translateSort } from "./translate/sort.js";
import { translateFilter } from "./translate/where.js";

/** Options accepted by {@link prismaAdapter}. */
export interface PrismaAdapterOptions {
  /** The unique field cursor pagination is based on. Defaults to `"id"`. */
  cursorField?: string;
  /**
   * Parses a cursor token (always a `string` in DSQL) back into the
   * value `cursorField` actually expects — e.g. `Number` for an `Int`
   * id. Defaults to the identity function, which is correct for `String`
   * ids (the common case, and what this package's own test schema uses).
   */
  parseCursorValue?: (raw: string) => unknown;
  /**
   * Whether to emit Prisma's `mode: "insensitive"` for `ilike` and
   * case-insensitive `search`. Defaults to `false` because it's
   * Postgres/MySQL-only — SQLite rejects it outright. See
   * `translate/options.ts` for the full rationale.
   */
  caseInsensitiveMode?: boolean;
  /** Adapter name reported in `DataSieveExecutionError` messages. Defaults to `"prisma"`. */
  name?: string;
}

/**
 * Creates the DataSieve adapter for Prisma: translates a normalized
 * {@link QueryAST} into Prisma Client calls and Prisma's results back
 * into the shape `@razsdev/datasieve-core` expects. See the package README for
 * exactly what's supported and the documented gaps (to-many relation
 * traversal, `distinct: true` without a `select`, `having` on aggregated
 * values, cursor pagination for grouped queries).
 *
 * Every query option built here (`where`, `orderBy`, `select`, `include`,
 * `distinct`, `having`) is passed to Prisma even when `undefined` —
 * Prisma treats an `undefined`-valued option the same as an omitted one,
 * so the translate/* helpers don't need to conditionally spread.
 *
 * @example
 * ```ts
 * const engine = createDataSieve({ adapter: prismaAdapter(prisma) });
 * const users = await engine.query<User>({ resource: prisma.user, query });
 * ```
 */
export function prismaAdapter(prisma: PrismaClientLike, options: PrismaAdapterOptions = {}): DataSieveAdapter<unknown> {
  const cursor: CursorOptions = {
    cursorField: options.cursorField ?? "id",
    parseCursorValue: options.parseCursorValue ?? ((raw) => raw),
  };
  const translateOptions: TranslateOptions = { caseInsensitiveMode: options.caseInsensitiveMode ?? false };

  return {
    name: options.name ?? "prisma",
    async execute(ast, resource) {
      // Generic-erasure boundary: see delegate.ts's TSDoc for why this
      // cast, rather than a structurally-typed parameter, is correct here.
      const delegate = resource as PrismaModelDelegate;
      return ast.grouping
        ? executeGrouped(delegate, ast, translateOptions)
        : executeFind(prisma, delegate, ast, cursor, translateOptions);
    },
  };
}

function combineWhere(ast: QueryAST, options: TranslateOptions): Record<string, unknown> | undefined {
  const filterWhere = translateFilter(ast.filter, options);
  const searchWhere = translateSearch(ast.search, options);
  if (filterWhere && searchWhere) return { AND: [filterWhere, searchWhere] };
  return filterWhere ?? searchWhere;
}

function translateDistinct(distinct: QueryAST["distinct"], selection: QueryAST["selection"]): string[] | undefined {
  if (!distinct) return undefined;
  if (Array.isArray(distinct)) return distinct;
  if (selection && selection.fields.length > 0) return selection.fields;
  throw new Error(
    '@razsdev/datasieve-prisma cannot translate `distinct: true` without an explicit `select` — Prisma requires a concrete list of fields to deduplicate on. Pass `select` alongside `distinct: true`, or pass `distinct` as an explicit field list instead.',
  );
}

async function executeFind(
  prisma: PrismaClientLike,
  delegate: PrismaModelDelegate,
  ast: QueryAST,
  cursor: CursorOptions,
  options: TranslateOptions,
): Promise<AdapterExecuteResult> {
  const where = combineWhere(ast, options);
  const orderBy = ast.sort.length > 0 ? translateSort(ast.sort) : undefined;
  const { select, include } = buildSelection(ast.selection, ast.relations, options);
  const distinct = translateDistinct(ast.distinct, ast.selection);
  const pagination = ast.pagination ?? { kind: "offset" as const, page: 1, pageSize: 20 };

  const findArgs: Record<string, unknown> = {
    where,
    orderBy,
    select,
    include,
    distinct,
    ...buildPaginationArgs(pagination, cursor),
  };

  if (pagination.kind === "cursor") {
    const rows = await delegate.findMany(findArgs);
    const page = resolveCursorPage(rows, pagination, cursor);
    return { data: page.data, nextCursor: page.nextCursor, previousCursor: page.previousCursor };
  }

  const [total, rows] = await prisma.$transaction([delegate.count({ where }), delegate.findMany(findArgs)]);
  return { data: rows, total };
}

async function executeGrouped(
  delegate: PrismaModelDelegate,
  ast: QueryAST,
  options: TranslateOptions,
): Promise<AdapterExecuteResult> {
  const grouping = ast.grouping;
  if (!grouping) {
    throw new Error("executeGrouped requires ast.grouping to be set.");
  }
  if (ast.pagination?.kind === "cursor") {
    throw new Error("@razsdev/datasieve-prisma does not support cursor pagination for grouped/aggregated queries.");
  }

  const { by, having, aggregateSelectors } = translateGrouping(grouping, ast.aggregations, options);
  const where = combineWhere(ast, options);
  const orderBy = ast.sort.length > 0 ? translateSort(ast.sort) : undefined;
  const offset = ast.pagination?.kind === "offset" ? ast.pagination : undefined;

  const groupByArgs: Record<string, unknown> = {
    by,
    where,
    having,
    orderBy,
    skip: offset ? (offset.page - 1) * offset.pageSize : undefined,
    take: offset?.pageSize,
    ...aggregateSelectors,
  };

  const rows = (await delegate.groupBy(groupByArgs)) as Record<string, unknown>[];
  return { data: rows.map((row) => reshapeGroupByRow(row, ast.aggregations)) };
}
