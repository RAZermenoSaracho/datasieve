# DataSieve v0.1.0

The first public release of DataSieve — a TypeScript-first backend data engine.

## Vision

Applications shouldn't hand-roll filtering, sorting, pagination, search, grouping, and aggregation for every resource they expose, and they shouldn't have to rewrite that logic every time they change database, ORM, or driver. DataSieve is a single, database-agnostic query language (DSQL) plus an engine that runs it against whatever storage technology an adapter translates it into. Applications describe *what* data they want; DataSieve — and its adapters — determine *how* to get it.

It is not an ORM, a query builder, or a Prisma wrapper. Those answer "how do I talk to this specific database?" DataSieve answers a different question: how do you describe filtering, sorting, pagination, search, grouping, and aggregation *once*, regardless of which database eventually answers it?

## Architecture

```
Your query (DSQL)
    -> Parse        (is this shaped like a query?)
    -> Validate      (is this query internally consistent?)
    -> Normalize     (public query -> internal AST)
    -> Plugin hooks   (cross-cutting concerns observe/augment)
    -> Adapter        (AST -> storage-specific query -> raw results)
    -> Transform      (raw results -> standardized response)
    -> Your response
```

Three architectural commitments hold this together, and hold for every future addition to the ecosystem:

- **DSQL never mentions storage.** The query language a consumer writes never references SQL, Prisma, Mongo, or any other storage concept. The moment a storage-specific idea leaks into the public API, switching storage technology becomes a breaking change for every application built on top.
- **The engine never knows adapters exist.** `@razsdev/datasieve-core` depends on nothing storage-specific; adapters depend on Core, never the reverse. Adding a new database is an additive new package, not a modification to shared, load-bearing code.
- **Everything is a replaceable seam.** Storage engine, caching, authorization, validation — each is a seam a project can swap independently, which is why plugins and adapters are separate concepts from the engine itself.

## Ecosystem

| Package | What it is |
|---|---|
| **`datasieve`** | The recommended install for almost everyone — `createDataSieve`, `prismaAdapter`, and the full query language, curated into one small public API. |
| `@razsdev/datasieve-query-language` | DSQL itself: the public query types, the operator catalog, and the internal AST — no execution, no adapters. |
| `@razsdev/datasieve-core` | The engine: the adapter contract, the execution pipeline, the plugin system, and the standardized response contract. |
| `@razsdev/datasieve-prisma` | The first adapter, translating DSQL into Prisma Client calls. |

Every adapter and plugin is an independent, optional install — the ecosystem grows by addition, not by modifying what already ships.

## What's in this release

**The query language.** `DataSieveQuery<T>` — a fully-inferred, autocomplete-driven query built from your own TypeScript types. Filtering (`and`/`or`/`not`, nested to unbounded depth, dot-path field references through nested objects and arrays) with a full operator catalog (`=`, `!=`, `>`, `>=`, `<`, `<=`, `in`, `notIn`, `like`, `ilike`, `contains`, `startsWith`, `endsWith`, `between`, `isNull`, `isNotNull`, `exists`, `notExists`, plus reserved `childOf`/`parentOf`). Free-text search, independent from filtering. Multi-key sorting. Offset and cursor pagination behind one unified input. `select`/`include` with scoped nested relation queries. `groupBy`/aggregations (`count`/`sum`/`avg`/`min`/`max`), designed now with execution support arriving as adapters implement it.

**The engine.** `createDataSieve({ adapter, plugins })` binds one adapter and any number of plugins into a reusable engine. `engine.query<T>({ resource, query })` runs the full pipeline — parse untrusted input, validate it, normalize it into an adapter-facing AST, run it through plugin hooks, execute it, and return a standardized response (`data` + `meta.total/page/pageSize/pageCount/hasNext/hasPrevious/cursor/executionTime`) — regardless of what database answered it. A five-hook plugin contract (`beforeNormalize`, `beforeExecute`, `afterExecute`, `afterTransform`, `onError`) is ready for cross-cutting concerns; a reference in-memory adapter (`createMemoryAdapter`) lets you unit-test DataSieve-powered code with zero database.

**The Prisma adapter.** Full translation of filtering, sorting, both pagination modes, `select`/`include`, search, and `groupBy`/aggregations into Prisma Client calls — validated against a real SQLite database (not mocks), 27 integration tests covering every feature and every documented edge case.

**The public package.** `datasieve` re-exports a deliberately curated ~40-symbol public surface — `createDataSieve`, `prismaAdapter`, the full query language, the operator registry, the response contract, every public error class, and the in-memory testing adapter. Internal implementation details (the AST, the adapter-authoring contract, pipeline/translation internals) are intentionally left out; they remain available via the individual `@razsdev/*` packages for adapter authors, plugin authors, and tooling builders.

## Current limitations

Documented, not hidden — each of these fails clearly (a thrown error or a structural impossibility) rather than silently returning wrong data:

- **Filtering/sorting through to-many relations isn't yet expressible in DSQL.** (e.g. "users with an order over $100") — Prisma requires `some`/`every`/`none` quantification that the query language doesn't have a way to express yet. Attempting it surfaces Prisma's own validation error.
- **A few Prisma-adapter translations are narrower than DSQL's full semantics**: `contains` assumes a string field rather than distinguishing scalar-list `has`; `isNull`/`isNotNull` use scalar rather than to-one-relation semantics; `ilike`/case-insensitive search only emit Postgres/MySQL's `mode: "insensitive"` when explicitly opted into (`caseInsensitiveMode: true`) since SQLite rejects that option outright; `having` supports grouped-field conditions but not conditions on aggregated values; `distinct: true` requires an explicit `select`.
- **Cursor pagination isn't supported for grouped/aggregated queries.**
- **The Prisma adapter is tested against Prisma 5.x** (the classic `prisma-client-js` generator). Prisma 7's newer client generator and `prisma.config.ts` convention haven't been validated.
- **No plugin ecosystem yet.** The plugin contract exists and is tested against synthetic plugins in `@razsdev/datasieve-core`'s own test suite, but no reference plugin (cache, soft delete, authorization) has been built against it yet — see the roadmap.
- **Only one adapter.** Prisma is the only storage technology DataSieve currently speaks.

## Roadmap

This release (Milestones 1–4) proves the architecture end to end: a database-agnostic language, an engine that runs it, a real adapter, and one public package tying them together. Getting to a stable 1.0 means proving the contract against more than one adapter and more than zero real plugins:

1. An adapter conformance test suite, so "the adapter contract" is enforced mechanically rather than by convention.
2. Closing the Prisma adapter's documented gaps (most notably to-many relation traversal), likely via a small DSQL extension.
3. Additional adapters — Drizzle and MongoDB first, then MySQL/PostgreSQL drivers and Elasticsearch.
4. Hardening the plugin contract against real needs (starting with a way to short-circuit execution, needed for caching), then shipping three reference plugins: soft delete, authorization, and caching.
5. Computed fields, performance benchmarks, a documentation website, an examples repository, a migration guide, and a formal semantic versioning policy.

See `ROADMAP.md` in the repository for the full detail and reasoning behind this order.

## Links

- Repository: https://github.com/RAZermenoSaracho/datasieve
- Issues: https://github.com/RAZermenoSaracho/datasieve/issues
- `@razsdev/datasieve-query-language`: https://www.npmjs.com/package/@razsdev/datasieve-query-language
- `@razsdev/datasieve-core`: https://www.npmjs.com/package/@razsdev/datasieve-core
- `@razsdev/datasieve-prisma`: https://www.npmjs.com/package/@razsdev/datasieve-prisma
