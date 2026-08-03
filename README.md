# DataSieve

A TypeScript-first backend data query engine.

## Overview

Every backend that exposes a list of records ends up reimplementing the same handful of concerns — filtering, sorting, pagination, search, grouping, and response formatting — once per resource, and often once per frontend that consumes it. That logic is rarely reusable across resources, and it is tightly coupled to whatever database or ORM the backend happens to use today.

DataSieve centralizes that logic into a database-agnostic layer. Applications describe *what* data they want using a single, strongly-typed query language (DSQL); DataSieve validates that description, normalizes it into an internal representation, and hands it to an **adapter** that knows how to translate it into calls against one specific storage technology. The frontend sends structured query parameters, the backend executes them through whatever adapter is configured, and the response follows one predictable contract — regardless of what database answered it.

The core engine has no knowledge of any particular database. Prisma is the first adapter implemented, not a foundation the rest of the architecture depends on; the same query language is meant to run against other adapters (Drizzle, MongoDB, SQL drivers, ...) without applications changing a line of query-writing code.

## Architecture

```
Frontend
   |
   v
API Request
   |
   v
DataSieve Query Language   (DSQL — what data is wanted)
   |
   v
DataSieve Core Engine       (parse, validate, normalize, plugins, standardized response)
   |
   v
Database Adapter            (DSQL -> storage-specific query)
   |
   v
Database
```

Each layer has exactly one responsibility, and the query language never mentions SQL, Prisma, or any other storage concept — the moment a storage-specific idea leaks into the public API, switching storage technology becomes a breaking change for every application built on top. See [`ROADMAP.md`](./ROADMAP.md) for the full architectural rationale and [`CLAUDE.md`](./CLAUDE.md) for the engineering rules that keep it that way.

## Package ecosystem

This is a pnpm-managed monorepo. Everything published lives under `packages/`:

| Package | Purpose | Database-dependent? |
|---|---|---|
| [`datasieve`](./packages/datasieve) | The public entry point. A curated re-export of `createDataSieve`, `prismaAdapter`, and the full query language — most applications should install only this. | No |
| [`@razsdev/datasieve-query-language`](./packages/query-language) | DSQL itself: query types, the operator catalog, filtering/sorting/pagination/selection/grouping/aggregation types, the internal query AST, and normalization. No execution, no adapters. | No |
| [`@razsdev/datasieve-core`](./packages/core) | The execution engine: the pipeline that runs a query (parse → validate → normalize → plugin hooks → adapter → standardized response), the adapter contract, the plugin/hook system, and the response contract. Knows nothing about Prisma or any specific database. | No |
| [`@razsdev/datasieve-prisma`](./packages/prisma) | The first database adapter. Translates DSQL into Prisma Client operations: filtering, sorting, pagination (offset and cursor), selection/include, search, and grouping/aggregation. | Yes (Prisma) |

`examples/` holds type-checked usage examples for the query language and the Prisma adapter; they are not published packages.

## Installation

Most applications only need the public package:

```sh
npm install datasieve @prisma/client
```

`@prisma/client` (and `prisma` as a dev dependency) is only needed because the Prisma adapter is currently the only adapter available. Advanced use cases — writing a custom adapter, authoring a plugin, building tooling on top of DSQL — can depend on the individual `@razsdev/datasieve-*` packages directly instead.

## Basic usage

```ts
import { PrismaClient } from "@prisma/client";
import { createDataSieve, prismaAdapter, type DataSieveQuery } from "datasieve";

const prisma = new PrismaClient();
const sieve = createDataSieve({ adapter: prismaAdapter(prisma) });

interface User {
  id: string;
  status: "ACTIVE" | "INACTIVE";
  createdAt: Date;
}

const query: DataSieveQuery<User> = {
  where: { field: "status", op: "=", value: "ACTIVE" },
  sort: [{ field: "createdAt", direction: "desc" }],
  pagination: { kind: "offset", page: 1, pageSize: 20 },
};

const result = await sieve.query<User>({ resource: prisma.user, query });

result.data; // User[]
result.meta; // { total, page, pageSize, pageCount, hasNext, hasPrevious, cursor, executionTime }
```

See [`packages/datasieve/README.md`](./packages/datasieve/README.md) for a more complete walkthrough, including validating untrusted input and querying relations.

## Design principles

- **TypeScript first.** The query language is built from your own domain types — field names, operators, and value types are all inferred, not stringly-typed.
- **Database-agnostic core.** The engine and the query language have zero knowledge of SQL, Prisma, or any other storage technology.
- **Adapter architecture.** Storage-specific translation lives entirely in adapters, which depend on the core — never the reverse. Adding a database is an additive package, not a change to shared code.
- **Strong typing throughout.** Filters, sorts, pagination, and selections are all typed against your resource's shape, with invalid field/operator/value combinations rejected at compile time.
- **Predictable responses.** Every query resolves to the same response contract (`data` + standardized `meta`), regardless of which adapter answered it or which pagination strategy was used.
- **Extensible pipeline.** Cross-cutting concerns (caching, soft deletes, authorization) hook into the execution pipeline as plugins, without the core or any adapter needing to know they exist.

## Current status

**Version: 0.1.0** — first public release, not yet published to npm.

Implemented:

- The DSQL query language — filtering (with a full operator catalog and unbounded `and`/`or`/`not` nesting), search, sorting, offset and cursor pagination, field selection, relation inclusion, and grouping/aggregation types.
- The core execution engine — the adapter contract, the parse/validate/normalize/execute pipeline, a plugin/hook system, and the standardized response contract.
- The Prisma adapter — translating DSQL into Prisma Client calls, validated against a real SQLite database.
- The public `datasieve` package — a curated, intentionally small re-export of the above.

Known limitations (filtering through to-many relations, a handful of Prisma-specific translation edge cases, Prisma 5.x-only validation) are documented in [`packages/prisma/README.md`](./packages/prisma/README.md) rather than hidden.

## Roadmap

The full milestone history, the architecture's reasoning, and what's planned on the way to a stable 1.0 (additional adapters, a plugin ecosystem, an adapter conformance suite, and more) live in [`ROADMAP.md`](./ROADMAP.md) — this README won't duplicate it.

## Development

This is a pnpm workspace.

```sh
pnpm install    # install dependencies
pnpm build      # build every package
pnpm test       # run every package's test suite
pnpm typecheck  # typecheck every package
```

Each package can also be built/tested/typechecked individually via `pnpm --filter <package-name> <script>`.

## Contributing

Issues and pull requests are welcome — whether that's a bug report, a documentation fix, or a proposal for a new adapter or plugin. If you're planning a non-trivial change, consider opening an issue first to discuss the approach against [`ROADMAP.md`](./ROADMAP.md).

## License

MIT — see [`LICENSE`](./LICENSE).
