# datasieve

**The TypeScript-first backend data engine.** Describe the data you want once, in one database-agnostic query language — DataSieve determines how to retrieve it.

DataSieve is not an ORM, not a query builder, and not a Prisma wrapper. Those answer "how do I talk to this specific database?" DataSieve answers a different question: how does an application describe filtering, sorting, pagination, search, grouping, and aggregation *once*, regardless of which database eventually answers it?

This package (`datasieve`) is the recommended way to install it — a small, curated re-export of the ecosystem's stable public API. Advanced use cases (writing a custom adapter, authoring a plugin, building tooling on top of DataSieve) can install the underlying `@razsdev/*` packages directly; see [Ecosystem](#ecosystem) below.

## Installation

```sh
npm install datasieve @prisma/client
```

(`@prisma/client` — and `prisma` as a dev dependency — are needed if you use the bundled Prisma adapter, which is the only adapter this package ships with today.)

## Quick start

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

`query` can also be `unknown` — a decoded request body/query string — since `sieve.query()` parses and validates it before ever touching Prisma:

```ts
import { ParseError, QueryValidationError } from "datasieve";

app.get("/users", async (req, res) => {
  try {
    res.json(await sieve.query<User>({ resource: prisma.user, query: req.query }));
  } catch (error) {
    if (error instanceof ParseError || error instanceof QueryValidationError) {
      return res.status(400).json({ issues: error.issues });
    }
    throw error;
  }
});
```

## Prisma example

One engine, reused across every model in your schema — `resource` picks which one per call:

```ts
interface Order {
  id: string;
  total: number;
  status: string;
  createdAt: Date;
  user: { id: string; name: string };
}

const activeOrders = await sieve.query<Order>({
  resource: prisma.order,
  query: {
    where: { and: [{ field: "status", op: "=", value: "PAID" }, { field: "total", op: ">", value: 100 }] },
    include: { user: { select: { id: true, name: true } } },
    sort: [{ field: "createdAt", direction: "desc" }],
    pagination: { kind: "cursor", take: 20 },
  },
});
```

See `@razsdev/datasieve-prisma`'s README for the full list of supported features and its documented limitations (e.g. filtering through to-many relations isn't yet expressible in DSQL).

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

The query language (DSQL) is entirely database-agnostic — it never mentions SQL, Prisma, or any other storage concept. The engine (`createDataSieve`) knows how to run that pipeline and defines the contract an adapter must fulfill, but has no idea what kind of database answers a query. Adapters (like the bundled `prismaAdapter`) are the only place storage-specific translation happens. See `ROADMAP.md` at the repo root for the full architectural rationale.

## Ecosystem

| Package | For |
|---|---|
| **`datasieve`** (this package) | Almost everyone. `createDataSieve`, `prismaAdapter`, and the full query language. |
| [`@razsdev/datasieve-query-language`](https://www.npmjs.com/package/@razsdev/datasieve-query-language) | Building tooling around DSQL itself (validators, codegen, a query builder UI) without pulling in the engine. |
| [`@razsdev/datasieve-core`](https://www.npmjs.com/package/@razsdev/datasieve-core) | Writing your own adapter or plugin, or needing the reference in-memory adapter's full API. |
| [`@razsdev/datasieve-prisma`](https://www.npmjs.com/package/@razsdev/datasieve-prisma) | Direct access to the Prisma adapter's translation internals (advanced/debugging use). |

Every adapter and plugin is an independent, optional package — installing `datasieve` never pulls in a database driver or ORM you don't use beyond Prisma's own client, which is a peer dependency, not bundled.

## Roadmap

DataSieve ships in milestones; `datasieve` (this package) is Milestone 4 — the point where the query language (Milestone 1), the engine (Milestone 2), and the first real adapter (Milestone 3) are all stable enough to have one blessed public entry point. See `ROADMAP.md` at the repo root for the full milestone history and the "Version 1.0 Roadmap" section for what's planned next (additional adapters, a plugin ecosystem, an adapter conformance suite, and more).

## License

MIT
