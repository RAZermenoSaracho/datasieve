# @datasieve/core

The DataSieve query engine. Turns a `DataSieveQuery` (from `@datasieve/query-language`) into a standardized response, by way of one storage adapter and any number of plugins — without ever knowing what kind of storage answered the query.

See `ROADMAP.md` and `CLAUDE.md` at the repo root for the full architectural context. This package implements Milestone 2.

## Concepts

- **`createDataSieve({ adapter, plugins })`** — the main entry point. Returns an engine bound to one adapter and plugin set.
- **`engine.query<T>({ resource, query })`** — runs the full pipeline for one query: `parseQuery -> validateQuery -> [beforeNormalize plugins] -> normalizeQuery -> [beforeExecute plugins] -> adapter.execute -> [afterExecute plugins] -> buildResponse -> [afterTransform plugins]`. `query` is untrusted input (e.g. a decoded request body); `resource` is whatever the bound adapter expects (a Prisma model delegate, a plain array for the reference in-memory adapter, ...).
- **`DataSieveAdapter<TResource, TRaw>`** — the contract a storage adapter implements: given a normalized `QueryAST` and a `resource`, return raw rows plus whatever pagination bookkeeping it can cheaply provide (`total`, `nextCursor`, `previousCursor`). Core computes everything else.
- **`DataSievePlugin`** — five optional, awaitable lifecycle hooks (`beforeNormalize`, `beforeExecute`, `afterExecute`, `afterTransform`, `onError`) for cross-cutting concerns (caching, soft deletes, authorization, ...) that don't require the pipeline or any adapter to know they exist.
- **`DataSieveResponse<T>`** — the standardized response contract (`data`, `meta.total/page/pageSize/pageCount/hasNext/hasPrevious/cursor/executionTime`), identical regardless of adapter or pagination strategy.
- **`createMemoryAdapter()`** — a reference adapter that interprets a `QueryAST` against a plain in-memory array. It's what proves this package's pipeline works without a real database, and it's a genuinely useful tool for testing DataSieve-powered application code. See its TSDoc for what's explicitly out of scope (array-relation dot paths, `include`/`groupBy`/`aggregations`, `childOf`/`parentOf`).

## Example

```ts
import { createDataSieve, createMemoryAdapter } from "@datasieve/core";

interface User {
  id: string;
  name: string;
  status: "ACTIVE" | "INACTIVE";
}

const users: User[] = [
  { id: "1", name: "Ada", status: "ACTIVE" },
  { id: "2", name: "Grace", status: "INACTIVE" },
];

const engine = createDataSieve({ adapter: createMemoryAdapter<User>() });

const response = await engine.query<User>({
  resource: users,
  query: { where: { field: "status", op: "=", value: "ACTIVE" } },
});
// response.data -> [{ id: "1", name: "Ada", status: "ACTIVE" }]
// response.meta -> { total: 1, page: 1, pageSize: 20, pageCount: 1, hasNext: false, hasPrevious: false, cursor: null, executionTime: <ms> }
```

## Extending

- **New plugin**: implement `DataSievePlugin`'s hooks; see `src/plugin/plugin.ts` for the soft-delete example in its TSDoc.
- **New adapter**: implement `DataSieveAdapter<TResource, TRaw>`; see `src/testing/memory-adapter.ts` for a complete reference implementation.
