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
| `datasieve` | The main public package most applications install. Re-exports the stable, blessed API surface from the packages below so a typical consumer never needs to think about the internal package boundaries. **Completed — see Milestone 4.** |
| `@datasieve/query-language` | DSQL — the database-agnostic query language. Public query types, operator definitions, the internal AST, and parse/validate/normalize. Has no knowledge of execution, adapters, or any specific storage technology. **Completed — see Milestone 1.** |
| `@datasieve/core` | The query engine. Defines the adapter contract, runs the execution pipeline, hosts the plugin and middleware system, and owns the standardized response contract (`DataSieveResponse<T>`). Depends on `@datasieve/query-language`; depends on nothing else in the ecosystem. **Completed — see Milestone 2.** |
| `@datasieve/prisma` | The first adapter. Translates `QueryAST` into Prisma Client calls and Prisma results back into the shapes Core expects. Proves the Core/adapter contract works against a real, popular ORM. **Completed — see Milestone 3.** |
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

### Milestone 3 — `@datasieve/prisma` ✅

**Status:** Completed

**Goal:** Implement the first real adapter, translating `QueryAST` into Prisma Client calls.

**Motivation:** Milestone 2 defines the adapter contract in the abstract, tested only against a fake. This milestone is where that contract meets reality for the first time — proving it is expressive enough to drive a real, popular ORM, and surfacing anywhere the contract was accidentally too abstract (missing something adapters need) or too concrete (assuming something only an in-memory fake could provide).

**Delivered:**
- `prismaAdapter(prisma, options?)` implementing Core's `DataSieveAdapter` — one adapter instance reusable across every model in a schema (`resource` picks the model delegate per call), consistent with `createDataSieve({ adapter: prismaAdapter(prisma) })` requiring no per-call wiring.
- Translation of every `QueryAST` node into Prisma arguments: `filter`/`search` → `where` (`AND`/`OR`/`NOT`, all operators except reserved `childOf`/`parentOf`), `sort` → `orderBy`, offset pagination → `skip`/`take` with `total` from a `count()` run in the same `$transaction` as the page fetch, cursor pagination → Prisma's native `cursor`/signed `take` plus the standard "fetch one extra row" trick for `hasNext`/`hasPrevious`, `selection`/`relations` → `select`/`include` (unified so requesting both doesn't hit Prisma's "can't use select and include together" restriction), `grouping`/`aggregations` → `groupBy` with results reshaped into the alias-keyed rows DSQL promises.
- A real SQLite-backed integration test suite (not mocks) — 27 tests across filtering, and/or/not, sort (incl. nested to-one paths), both pagination modes, select/include (incl. scoped nested relations), search, grouping/aggregation, and a full `createDataSieve()` + plugin end-to-end path — plus 5 type-checked usage examples.
- A README documenting exactly what's supported and six explicit, individually-justified limitations discovered while building this (to-many relation traversal, `contains` on scalar-list fields, relation-null-check semantics, provider-specific case-insensitive matching, `having` on aggregated values, `distinct: true` without a `select`) — each backed by a real failing-fast behavior (a clear thrown error or a documented no-op), never a silent wrong answer.

**Notable finding:** Prisma's `mode: "insensitive"` filter option — needed for `ilike`/case-insensitive search — is Postgres/MySQL-only and SQLite's query engine rejects it outright at runtime. This was caught by actually running the test suite against a real SQLite database (not by reasoning about the translation in the abstract), and is exactly the kind of gap Milestone 2's fake-adapter-only testing couldn't have surfaced — validating this milestone's own motivation. Fixed via an opt-in `caseInsensitiveMode` adapter option, defaulting to `false` (safe on every provider).

**Exit criteria (met):** `pnpm build`, `pnpm typecheck`, and `pnpm test` all pass across the workspace; zero Prisma imports anywhere in `@datasieve/core`; every exported symbol has TSDoc; grouping/aggregation are translated where Prisma supports them, with unsupported cases (cursor pagination on grouped queries, `having` on aggregated values) failing clearly rather than silently. Core was reviewed against this real adapter's needs and required no changes — see the implementation summary for details.

---

### Milestone 4 — `datasieve` ✅

**Status:** Completed

**Goal:** Ship the single public package most applications actually install.

**Motivation:** `@datasieve/query-language`, `@datasieve/core`, and `@datasieve/prisma` exist as separate packages for internal composability and so advanced users (and future adapter authors) can depend on exactly what they need. Most application developers don't want to reason about that boundary — they want `npm install datasieve` and a working engine.

**Delivered:**
- `datasieve` — a re-export-only package (no logic of its own) depending on `@datasieve/core`, `@datasieve/query-language`, and `@datasieve/prisma` via `workspace:*`, giving `createDataSieve()` + `prismaAdapter()` + the full query language in one install.
- A **deliberately curated** public surface, not a blanket re-export: `QueryAST` and every AST node type, the adapter-authoring contract (`DataSieveAdapter`, `AdapterExecuteResult`), the pipeline internals (`executeQuery`, `runHooks`, `buildResponse`, `parseQuery`/`validateQuery`/`normalizeQuery`), and every `@datasieve/prisma` translation helper are all deliberately **excluded** — each is exactly the kind of implementation detail an application developer never touches, and each remains one `npm install @datasieve/<package>` away for the advanced users (adapter authors, plugin authors, tooling builders) who do need it. `DataSievePlugin`/`DataSievePluginContext` and `createMemoryAdapter` *are* included, since configuring plugins and unit-testing DataSieve-powered code without a database are both mainstream usage, not advanced authoring.
- Production package metadata (license, repository+directory, homepage, bugs, keywords, `publishConfig.access: public`) for **all four** publishable packages, not just the new one — the first real release audit, so this was fixed everywhere at once rather than only where this milestone happened to be looking. Same for a per-package `LICENSE` file (a root-only `LICENSE` doesn't get bundled into any individual package's npm tarball).
- `@datasieve/prisma` gained a `@prisma/client` `peerDependency` it was missing — it only had `@prisma/client` as a *dev* dependency (used to build/test the adapter itself), which is invisible to actual consumers of the published package.
- A README covering installation, a quick-start, a Prisma-specific example, the architecture, the full ecosystem table, and a roadmap summary.

**Two issues this milestone's own verification pass caught:**
- The workspace root `package.json` was itself named `"datasieve"` (a leftover from Milestone 1, before this package existed) — a direct name collision with the new public package inside the same pnpm workspace, silently causing `pnpm --filter datasieve` to resolve ambiguously. Renamed the root to `datasieve-monorepo` (it's `private: true` and never published, so only the workspace-internal name mattered).
- Running `npm pack --dry-run` for real (rather than assuming the `"files"` field was sufficient) is what surfaced the missing per-package `LICENSE` files above — exactly the kind of gap that's invisible until you actually inspect the tarball a real `npm publish` would produce.

**Exit criteria (met):** `pnpm build`, `pnpm typecheck`, and `pnpm test` all pass across the workspace; a new project can `npm install datasieve`, call `createDataSieve()`, write a `DataSieveQuery`, and get a standardized response without installing any other `@datasieve/*` package directly; `npm pack --dry-run` for all four publishable packages contains only production files (`dist/`, `README.md`, `LICENSE`, `package.json` — no source, tests, or config).

---

## Version 1.0 Roadmap

Milestones 1–4 proved the architecture end to end: a database-agnostic language, an engine that runs it, a real adapter, and one public package tying them together. They are not, by themselves, a 1.0 — a 1.0 is a promise that the public contract (DSQL, the adapter interface, the plugin interface, `datasieve`'s own exports) won't break out from under anyone who builds on it. Getting there means proving the contract against more than one adapter and more than zero real plugins, and putting the operational scaffolding (docs, benchmarks, a versioning policy) around it that a "stable" label implies.

This section is **documentation of planned work, not implemented work** — per the roadmap's own development process, none of it begins until it's actually next in line. It supersedes the informal "Future Milestones" notes that lived here before Milestone 4; the items below are the concrete, ordered version of that same direction.

1. **Adapter conformance test suite.** Before building a second real adapter, extract `@datasieve/prisma`'s integration tests into a shared, adapter-agnostic behavioral suite (any `DataSieveAdapter` implementation can run it against its own storage). This is the same "define the contract before the next thing depends on it" move Milestone 2 made for the adapter interface itself — without it, "the adapter contract" is only enforced by convention, and every new adapter risks quietly drifting from what Prisma's happened to need.
2. **Adapter feature parity.** Close the gaps `@datasieve/prisma`'s README documents today (to-many relation traversal needs an explicit quantifier on `Condition`/`SortField`; `contains`/`isNull` need field-type awareness; `having` needs to reference aggregation aliases) — likely a small, additive DSQL extension plus updated adapter translation, verified against the conformance suite from (1) so the fix is provably complete, not just "works for the case someone happened to test."
3. **Additional adapters** — Drizzle, MongoDB, then MySQL/PostgreSQL (driver-level) and Elasticsearch, in roughly that order (closest to Prisma's relational model first). Each is additive once (1) and (2) land, built against a contract two adapters have already stress-tested rather than one.
4. **Plugin system implementation.** Core's plugin *contract* (Milestone 2) has never been exercised by a real plugin with real needs. Before shipping reference plugins, harden it against what they actually require — most notably a way for a plugin to short-circuit execution entirely (a cache hit shouldn't still call the adapter), which was explicitly deferred in Milestone 2 to avoid designing it speculatively.
5. **Soft delete plugin.** The simplest reference plugin (pure query rewriting, no external state) — a deliberate first plugin to validate the hardened contract from (4) with the lowest-risk case.
6. **Authorization plugin.** Tenant/ownership-scoped query rewriting; a second, more demanding validation of the plugin contract (needs request-scoped context, not just static rewriting).
7. **Caching plugin.** Needs the short-circuit capability from (4) plus `afterExecute` population — the plugin the contract was hardened for, built last so it's validating a settled contract rather than driving further changes to it.
8. **Computed fields.** `@datasieve/query-language` reserved this extension point in Milestone 1 (`ComputedFieldsInput`) without wiring it through `FieldPath`, `SelectInput`, `SortInput`, or the AST — deliberately, since that's a real expansion of the type surface. Design and implement that wiring once there's real plugin/adapter experience (from 1–7) informing what a computed field actually needs to interoperate with.
9. **Performance benchmarks.** A benchmark suite comparing DataSieve-mediated queries against hand-written equivalents (raw Prisma, raw SQL) across representative query shapes, run in CI, to catch abstraction-overhead regressions before they ship rather than after users notice.
10. **Documentation website.** Every package has a README; there's no single place that explains DSQL's philosophy, walks through the pipeline, or cross-links the ecosystem the way `ROADMAP.md` does for contributors today. A docs site is that, for users.
11. **Examples repository.** A separate, runnable (not just type-checked) example application — the `examples/*` directories in this repo intentionally stay minimal and type-check-only; a dedicated repo is where a full, deployable reference app belongs.
12. **Migration guide.** For teams adopting DataSieve incrementally on an existing codebase (most realistically: an existing Prisma app) — how to introduce `sieve.query()` alongside hand-written queries without a big-bang rewrite.
13. **Semantic versioning policy.** A written policy for what counts as breaking across a multi-package ecosystem — does adding a `QueryAST` node count as breaking for adapter authors? Does a new required plugin hook? How does `datasieve`'s own version relate to the packages it re-exports when they don't move in lockstep? This governs how every change above gets released, which is why it's listed last but should realistically be settled early — before (3)'s first additional adapter ships, at the latest.

---

## Beyond 1.0

Longer-tail ideas that aren't required for a 1.0 label but are worth keeping visible: protocol helpers (GraphQL and REST helpers that expose a DataSieve-powered resource without hand-written translation code), devtools for inspecting a query's journey through the pipeline, and (low priority) editor tooling such as a VS Code extension. None of these are scheduled.

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
