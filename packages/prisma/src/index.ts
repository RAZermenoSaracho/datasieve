/**
 * @packageDocumentation
 *
 * `@razsdev/datasieve-prisma` — the first DataSieve adapter.
 *
 * Translates `@razsdev/datasieve-core`'s normalized `QueryAST` into Prisma
 * Client calls (`findMany`/`count`/`groupBy`) and Prisma's results back
 * into the shape Core expects. This package owns every Prisma-specific
 * concept (`where`, `orderBy`, `skip`/`take`/`cursor`, `select`,
 * `include`, `groupBy`/aggregate selectors) — neither `@razsdev/datasieve-core`
 * nor `@razsdev/datasieve-query-language` know Prisma exists.
 *
 * Start with {@link prismaAdapter}. See the README for supported
 * features and documented limitations.
 */

export { prismaAdapter } from "./adapter.js";
export type { PrismaAdapterOptions } from "./adapter.js";

export type { PrismaClientLike, PrismaModelDelegate } from "./delegate.js";

// Translation helpers, exported for advanced use (custom tooling,
// debugging what an AST translates to) and as the concrete extension
// points referenced throughout this package's TSDoc/README.
export { nestPath } from "./translate/path.js";
export type { TranslateOptions } from "./translate/options.js";
export { translateFilter, translateOperator } from "./translate/where.js";
export { translateSearch } from "./translate/search.js";
export { translateSort } from "./translate/sort.js";
export { buildSelection } from "./translate/selection.js";
export type { PrismaSelection } from "./translate/selection.js";
export { buildPaginationArgs, resolveCursorPage } from "./translate/pagination.js";
export type { CursorOptions, CursorPage, PaginationArgs } from "./translate/pagination.js";
export { reshapeGroupByRow, translateGrouping } from "./translate/aggregate.js";
export type { GroupByTranslation } from "./translate/aggregate.js";
