# DataSieve Roadmap

This document is the single source of truth for DataSieve's long-term direction. It explains where the project is going, why it is structured the way it is, and in what order it gets built. `CLAUDE.md` captures the engineering rules that keep every contributor (human or AI) aligned with this roadmap day to day; this document explains the reasoning behind those rules and tracks progress against the plan.

If a proposed change conflicts with this roadmap, the roadmap wins until it is deliberately revised — not silently worked around.

---

## Vision

DataSieve is a TypeScript-first **backend data engine**.

It is not an ORM. It is not a query builder. It is not a Prisma wrapper. Those tools answer "how do I talk to this specific database?" DataSieve answers a different question: "how does an application describe the data it wants, once, regardless of which database eventually answers it?"

Concretely, DataSieve owns:

- Filtering
- Sorting
- Pagination (offset and cursor)
- Grouping
- Aggregation
- Searching
- Standardized response payloads
- Adapter abstraction (translating one query language into many storage technologies)
- A plugin system for cross-cutting concerns (caching, soft deletes, authorization, tenancy, ...)

The ambition is for DataSieve to become the standard data-access layer for TypeScript backends the way Zod became the standard for validation and Prisma became the standard for schema-driven database access — a dependency so foundational that reaching for it is the default, not a decision.

All business logic stays on the backend. A frontend using a DataSieve-powered API sends query parameters shaped like DSQL and renders whatever standardized response comes back. It never needs to know, or care, whether that response was served by Postgres, MongoDB, or a REST API three layers downstream.

---

## Philosophy

Three commitments shape every design decision in this project:

**Describe *what*, never *how*.** The query language a consumer writes (DSQL, see Milestone 1) never mentions SQL, Prisma, Mongo, or any other storage concept. This is not a stylistic preference — it is the entire value proposition. The moment a storage-specific idea leaks into the public API, switching storage technology becomes a breaking change for every application built on top, and the abstraction has failed.

**The Core must never know adapters exist.** Dependencies flow one way: adapters depend on `@datasieve/core`, never the reverse. This is what makes "add a new database" an additive change (a new package) rather than a modification to shared, load-bearing code. Prisma is the first adapter DataSieve ships with, not a foundation anything else is built on.

**Everything should be replaceable.** Storage engine, ORM, caching, authorization, serialization, validation — each is a seam, not a hardcoded assumption. A project should be able to swap any one of these without rewriting the others. This is why plugins and adapters are separate concepts from the Core: the Core orchestrates, adapters execute, plugins observe and augment.

---

## Architecture

DataSieve is a layered pipeline. Each layer has exactly one responsibility, and a request only ever flows in one direction through it:

```
Request (DSQL)
    -> Parse        (is this shaped like a query?)
    -> Validate      (is this query internally consistent?)
    -> Normalize     (public API -> internal AST)
    -> Plugin hooks   (cross-cutting concerns observe/augment the AST)
    -> Adapter        (AST -> storage-specific query -> raw results)
    -> Transform      (raw results -> standardized response)
    -> Response (DataSieveResponse<T>)
```

Two splits make this pipeline sustainable as the ecosystem grows:

**Public API vs. internal AST.** Applications write `DataSieveQuery<T>`, a fully-generic, autocomplete-driven type. Adapters consume `QueryAST`, a simpler, string-keyed structure with no generics. The public API's job is compile-time developer experience; the AST's job is to be a small, stable, easy-to-pattern-match contract that doesn't change shape every time a new domain type is queried. `normalizeQuery` is the one-way bridge between them, and it is the only place in the codebase that is allowed to erase `T`.

**Core vs. adapters vs. plugins.** The Core (`@datasieve/core`) knows how to run the pipeline above and defines the *contract* an adapter must fulfill — it does not know how to talk to any particular database. Adapters (`@datasieve/prisma` and, later, others) implement that contract for one storage technology. Plugins hook into the pipeline at defined points (before normalize, before execute, after transform, ...) to add behavior — caching, soft-delete filtering, tenant scoping, authorization — without the Core or any adapter needing to know they exist.

---

## Package Ecosystem

| Package | Responsibility |
|---|---|
| `datasieve` | The main public package most applications install. Re-exports the stable, blessed API surface from the packages below so a typical consumer never needs to think about the internal package boundaries. |
| `@datasieve/query-language` | DSQL — the database-agnostic query language. Public query types, operator definitions, the internal AST, and parse/validate/normalize. Has no knowledge of execution, adapters, or any specific storage technology. **Completed — see Milestone 1.** |
| `@datasieve/core` | The query engine. Defines the adapter contract, runs the execution pipeline, hosts the plugin and middleware system, and owns the standardized response contract (`DataSieveResponse<T>`). Depends on `@datasieve/query-language`; depends on nothing else in the ecosystem. **Completed — see Milestone 2.** |
| `@datasieve/prisma` | The first adapter. Translates `QueryAST` into Prisma Client calls and Prisma results back into the shapes Core expects. Proves the Core/adapter contract works against a real, popular ORM. **Next — see Milestone 3.** |
| `@datasieve/drizzle`, `@datasieve/mongodb`, `@datasieve/mysql`, `@datasieve/postgres`, `@datasieve/elasticsearch` | Additional adapters, each translating `QueryAST` into one storage technology's native query interface. Built only after the Prisma adapter has stabilized the adapter contract, so each one is additive rather than a renegotiation of the interface. |
| `@datasieve/plugin-cache`, `@datasieve/plugin-soft-delete`, `@datasieve/plugin-auth` | Reference plugins for common cross-cutting concerns, built against Core's plugin API. They exist both to be genuinely useful and to validate that the plugin API is expressive enough for real needs before third parties build their own. |

Every adapter and plugin package is independent and optional. None of them are dependencies of `@datasieve/core` — Core only ever depends *downward* toward `@datasieve/query-language`.

---

## Implementation Order

The build order is not arbitrary — each milestone exists to de-risk the one after it:

1. **The language comes first** because everything else — the Core's pipeline, every adapter's translation layer, every plugin's hook points — is defined in terms of it. Building an engine before the language it speaks is stable would mean rebuilding that engine every time the language changed.
2. **The engine comes before any adapter** because the Core is where the Core/adapter contract is *defined*. Writing the contract and its first consumer at the same time, in the same package, risks quietly coupling the two — the contract ends up shaped like "whatever Prisma needs" instead of "whatever any storage technology could need." Core must be provably adapter-agnostic (tested against a fake adapter) before a real adapter is allowed to exist.
3. **The first adapter comes before the public package** because `datasieve` (the umbrella package) is only worth shipping once there is something real to re-export end to end — language, engine, and at least one working adapter.
4. **Every subsequent adapter and plugin is additive**, built against a contract that Milestones 1–4 have already proven out, rather than each one re-litigating what the contract should be.

---

## Milestones

### Milestone 1 — `@datasieve/query-language` ✅

**Status:** Completed

**Goal:** Define DSQL, the public, database-agnostic query language every future adapter will consume.

**Motivation:** Every other part of the system — the Core's pipeline, every adapter's translation logic, every plugin's hook points — needs a stable contract to be written against. Without a language, there is nothing to build an engine around.

**Delivered:**
- `FieldPath<T>` / `FieldPathValue<T, P>` — depth-limited, recursive dot-notation field inference over nested objects and arrays, safe against self-referential domain models.
- A full operator catalog (`=`, `!=`, `>`, `>=`, `<`, `<=`, `in`, `notIn`, `like`, `ilike`, `contains`, `startsWith`, `endsWith`, `between`, `isNull`, `isNotNull`, `exists`, `notExists`, plus reserved `childOf`/`parentOf`), with compile-time rules restricting which operators apply to which field types and a runtime metadata registry adapters can introspect.
- `Condition<T>` and `WhereInput<T>` — a fully-inferred `{field, op, value}` union combined through unboundedly nested `and`/`or`/`not`, directly inspired by Odoo Domains.
- `SearchInput<T>`, `SortInput<T>`, and unified offset/cursor `PaginationInput`.
- `SelectInput<T>` / `IncludeInput<T>`, deriving scalar vs. relation fields structurally from `T`'s shape.
- `GroupByInput<T>` and `AggregationInput<T>`, designed and typed now, with execution intentionally left to adapters in a later milestone.
- `DataSieveQuery<T>`, the public root type, and `QueryAST`, the internal string-keyed representation adapters will consume, bridged by a fully-implemented `normalizeQuery`.
- Skeleton `parseQuery` (shape validation) and `validateQuery` (structural consistency), deliberately schema-free — see Milestone 2 for where deeper validation plugs in.
- Comprehensive TSDoc, ten example files covering every major feature, and a full unit + type-level test suite.

**Exit criteria (met):** `pnpm typecheck`, `pnpm test`, and `pnpm build` all pass; the package has zero dependencies on any adapter, ORM, or database driver; every exported symbol has TSDoc; examples type-check as a real external consumer of the package.

---

### Milestone 2 — `@datasieve/core` ✅

**Status:** Completed

**Goal:** Build the query engine that turns a `DataSieveQuery<T>` and a storage adapter into a standardized response — without knowing what kind of storage that adapter talks to.

**Motivation:** DSQL defines *what* a query means; Core defines *how a query gets run*, generically. Per `CLAUDE.md`'s golden rules, the Core must own the execution pipeline and the response contract while remaining completely ignorant of any specific adapter. If this contract is designed later, alongside the first real adapter, it inevitably gets shaped by that adapter's specifics rather than by what execution actually requires in general — which is exactly the coupling this milestone exists to prevent.

**Delivered:**
- `createDataSieve()` — the public factory that wires one adapter and a set of plugins into a queryable engine (`engine.query<T>({ resource, query })`).
- The **adapter interface** (`DataSieveAdapter<TResource, TRaw>`) — given a normalized `QueryAST` and an opaque `resource` handle, return raw rows plus whatever pagination bookkeeping (`total`, `nextCursor`, `previousCursor`) is cheap to provide. Everything else a response needs is computed centrally by Core, so no adapter has to reimplement pagination math.
- The **execution pipeline** (`executeQuery`) — `parse → validate → [beforeNormalize plugins] → normalize → [beforeExecute plugins] → adapter.execute → [afterExecute plugins] → buildResponse → [afterTransform plugins]`, reusing `@datasieve/query-language`'s own `parseQuery`/`validateQuery`/`normalizeQuery` rather than re-implementing that layer.
- The **plugin interface** (`DataSievePlugin`) — five optional, awaitable lifecycle hooks (`beforeNormalize`, `beforeExecute`, `afterExecute`, `afterTransform`, `onError`), enough to express soft-delete/auth-style query rewriting and cache-style observation without speculatively designing those plugins' own future APIs.
- A **middleware pipeline** (`runHooks`) — one small, DataSieve-agnostic function every plugin lifecycle stage is built from, threading each hook's return value into the next.
- `DataSieveResponse<T>` — the standardized response contract from `CLAUDE.md`, extended with nullable `total`/`page`/`pageCount` and an optional `cursor` field so cursor pagination is represented honestly without changing the contract's shape for offset consumers.
- `DataSieveExecutionError` — adapter failures are caught and wrapped with the failing adapter's name and the original error as `cause`, kept distinct from `@datasieve/query-language`'s `ParseError`/`QueryValidationError`, which the adapter never even sees.
- `createMemoryAdapter()` — a reference in-memory adapter (filtering, and/or/not, search, multi-key sort, `select`, offset and cursor pagination) that proves the pipeline end to end with zero real databases, and doubles as a tool for testing DataSieve-powered application code.
- Comprehensive TSDoc and a full unit + integration test suite (response-building math, hook composition, the in-memory adapter's own semantics, and end-to-end `engine.query()` runs including plugin mutation and error propagation).

**Exit criteria (met):** `pnpm typecheck`, `pnpm test`, and `pnpm build` all pass; the in-memory adapter is exercised end to end in tests with zero real databases involved; `@datasieve/core`'s `package.json` depends only on `@datasieve/query-language` — no adapter package; every exported symbol has TSDoc.

---

### Milestone 3 — `@datasieve/prisma`

**Status:** Next

**Goal:** Implement the first real adapter, translating `QueryAST` into Prisma Client calls.

**Motivation:** Milestone 2 defines the adapter contract in the abstract, tested only against a fake. This milestone is where that contract meets reality for the first time — proving it is expressive enough to drive a real, popular ORM, and surfacing anywhere the contract was accidentally too abstract (missing something adapters need) or too concrete (assuming something only an in-memory fake could provide).

**Deliverables:**
- A `PrismaAdapter` implementing Core's adapter interface.
- Translation of every `QueryAST` node — filters, sort, pagination, selection, relations, distinct — into Prisma's `where`/`orderBy`/`skip-take` or cursor arguments, `select`, and `include`.
- An adapter-level test suite (against an in-memory/SQLite Prisma schema) mirroring Core's plugin and execution contract.

**Exit criteria:** The adapter passes its integration suite; zero Prisma types are importable from `@datasieve/core`; grouping/aggregation are translated where Prisma supports them, with unsupported cases failing clearly rather than silently.

---

### Milestone 4 — `datasieve`

**Status:** Future

**Goal:** Ship the single public package most applications actually install.

**Motivation:** `@datasieve/query-language`, `@datasieve/core`, and `@datasieve/prisma` exist as separate packages for internal composability and so advanced users (and future adapter authors) can depend on exactly what they need. Most application developers don't want to reason about that boundary — they want `npm install datasieve` and a working engine.

**Deliverables:**
- Re-exports of the stable, blessed API surface from `@datasieve/query-language` and `@datasieve/core`.
- A documented versioning/compatibility policy between `datasieve` and the packages it re-exports.

**Exit criteria:** A new project can `npm install datasieve`, call `createDataSieve()`, write a `DataSieveQuery`, and get a standardized response, without installing or importing any other `@datasieve/*` package directly (adapters remain separate installs, since they carry their own peer dependencies).

---

## Future Milestones

Everything below is a long-term direction, not queued work. None of it begins until Milestone 4 is stable — sequencing it earlier would mean building against a Core/adapter contract that hasn't yet been proven by a real adapter and a real public package.

- **Additional adapters** — Drizzle, MongoDB, MySQL, PostgreSQL (driver-level), Elasticsearch. Each is additive once the adapter contract is stable.
- **Plugin ecosystem** — caching, soft deletes, authorization, multi-tenancy, auditing, tracing, and the public plugin API needed for third parties to build their own.
- **Protocol helpers** — GraphQL and REST helpers that make it trivial to expose a DataSieve-powered resource over either protocol without hand-writing translation code.
- **Performance work** — query plan analysis, execution benchmarking, and optimization passes once there is enough real usage to optimize for.
- **Developer tooling** — devtools for inspecting a query's journey through the pipeline, a benchmark suite, a documentation website, a dedicated examples repository, and (optionally, low priority) editor tooling such as a VS Code extension.

These are described here so the long-term shape of the ecosystem is visible, not because any of them is scheduled.

---

## Development Process

Implementation always follows this roadmap, in order:

- **Only one milestone is implemented at a time.** Starting the next milestone before the current one is stable means building on a contract that hasn't been proven yet.
- **Each milestone must be completed, reviewed, tested, and stabilized before the next one begins.** "Completed" means its exit criteria are met, not just that code exists.
- **Milestones are not skipped.** Each one exists specifically to de-risk the ones that follow it (see "Implementation Order" above); skipping one reintroduces the risk it was meant to remove.
- **Future milestones are not implemented early**, even partially, even when it looks convenient. Speculative work against an unstable contract is often more expensive to undo than to have not written.

When in doubt about what to work on next: read this roadmap, find the first milestone not marked Completed, and implement only that one.

---

## Long-Term Goals

DataSieve's long-term success looks like:

- Backend developers reaching for DataSieve the way they reach for Zod or Prisma today — as an obvious default, not a deliberated choice.
- A healthy ecosystem of third-party adapters and plugins built against a Core/adapter/plugin contract stable enough that they don't break every release.
- Frontend and backend teams sharing one query language across every service, regardless of what each service's database happens to be.
- An architecture where "we're migrating databases" is a backend infrastructure decision, not a project-wide rewrite.

This roadmap will be revised as the project learns — but only deliberately, and only by updating this document first.
