/**
 * @packageDocumentation
 *
 * `datasieve` — the public entry point to the DataSieve ecosystem.
 *
 * This package is intentionally thin: it re-exports a small, curated
 * subset of `@datasieve/core`, `@datasieve/query-language`, and
 * `@datasieve/prisma` — the stable API most applications ever need —
 * so a typical project depends on one package instead of reasoning
 * about internal boundaries between the query language, the engine,
 * and each adapter.
 *
 * It contains no logic of its own. Every symbol below is implemented in,
 * and documented in full in, its source package; this file is a curated
 * *selection*, not a copy. What's deliberately **not** re-exported here
 * (the internal `QueryAST`, the adapter/plugin authoring contracts, each
 * adapter's translation internals, ...) remains available to advanced
 * users — adapter authors, plugin authors, anyone building tooling on
 * top of DataSieve — by installing the relevant `@datasieve/*` package
 * directly. See `ROADMAP.md` at the repo root for why the ecosystem is
 * split this way.
 *
 * @example
 * ```ts
 * import { createDataSieve, prismaAdapter, type DataSieveQuery } from "datasieve";
 * import { PrismaClient } from "@prisma/client";
 *
 * const prisma = new PrismaClient();
 * const sieve = createDataSieve({ adapter: prismaAdapter(prisma) });
 *
 * interface User { id: string; status: "ACTIVE" | "INACTIVE"; createdAt: Date }
 *
 * const query: DataSieveQuery<User> = {
 *   where: { field: "status", op: "=", value: "ACTIVE" },
 *   sort: [{ field: "createdAt", direction: "desc" }],
 *   pagination: { kind: "offset", page: 1, pageSize: 20 },
 * };
 *
 * const result = await sieve.query<User>({ resource: prisma.user, query });
 * ```
 */

// -- Engine -----------------------------------------------------------------
// createDataSieve() is the main entry point: bind an adapter (and,
// optionally, plugins) once, then run any number of queries against any
// resource that adapter understands.
export { createDataSieve } from "@datasieve/core";
export type { CreateDataSieveOptions, DataSieveEngine, DataSieveQueryInput } from "@datasieve/core";

// -- Adapters -----------------------------------------------------------------
// prismaAdapter() is the only adapter bundled with this package today.
// Adapters for other storage technologies remain separate installs (see
// the README's "Ecosystem" section) since each carries its own peer
// dependency (an ORM/driver) this package shouldn't force on everyone.
export { prismaAdapter } from "@datasieve/prisma";
export type { PrismaAdapterOptions } from "@datasieve/prisma";

// -- Plugins -----------------------------------------------------------------
// The shape a plugin implements — needed to type a plugin you write
// inline, or one imported from a future @datasieve/plugin-* package.
export type { DataSievePlugin, DataSievePluginContext } from "@datasieve/core";

// -- Query language (DSQL) -----------------------------------------------------------------
// DataSieveQuery<T> is the root type every query is written against.
// The rest are the pieces it's composed from — exported so they can be
// used standalone (e.g. `const where: WhereInput<User> = {...}`).
export type { DataSieveQuery } from "@datasieve/query-language";
export type { FieldPath, FieldPathValue } from "@datasieve/query-language";
export type { Condition, WhereInput } from "@datasieve/query-language";
export type { SearchInput, SearchMode } from "@datasieve/query-language";
export type { SortDirection, SortField, SortInput } from "@datasieve/query-language";
export type { CursorPagination, OffsetPagination, PaginationInput } from "@datasieve/query-language";
export type { SelectInput } from "@datasieve/query-language";
export type { IncludeInput } from "@datasieve/query-language";
export type { GroupByInput } from "@datasieve/query-language";
export type { AggregationFunction, AggregationInput } from "@datasieve/query-language";

// -- Operators -----------------------------------------------------------------
// Operator is the full set of valid `op` values; OPERATORS/OPERATOR_NAMES
// is a runtime registry (name -> arity/description), useful for building
// tooling like a dynamic query-builder UI.
export type { Operator, OperatorArity, OperatorDefinition } from "@datasieve/query-language";
export { OPERATORS, OPERATOR_NAMES } from "@datasieve/query-language";

// -- Response contract -----------------------------------------------------------------
// The standardized shape every query resolves to, regardless of adapter.
export type { DataSieveResponse, DataSieveResponseCursor, DataSieveResponseMeta } from "@datasieve/core";

// -- Errors -----------------------------------------------------------------
// Every error `sieve.query()` can throw. ParseError/QueryValidationError
// come from malformed input (never reaching the adapter);
// DataSieveExecutionError wraps a failure from the adapter itself.
export { DataSieveError, ParseError, QueryValidationError } from "@datasieve/query-language";
export type { DataSieveIssue } from "@datasieve/query-language";
export { DataSieveExecutionError } from "@datasieve/core";

// -- Testing -----------------------------------------------------------------
// A reference in-memory adapter for unit-testing DataSieve-powered
// application code without a real database. Not for production use.
export { createMemoryAdapter } from "@datasieve/core";
export type { MemoryAdapterOptions } from "@datasieve/core";
