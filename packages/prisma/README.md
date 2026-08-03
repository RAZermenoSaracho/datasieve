# @datasieve/prisma

The first DataSieve adapter. Translates `@datasieve/core`'s normalized `QueryAST` into [Prisma Client](https://www.prisma.io/) calls, and Prisma's results back into the shape Core expects. This package owns every Prisma-specific concept — `where`, `orderBy`, `skip`/`take`/`cursor`, `select`, `include`, `groupBy`/aggregate selectors — so that neither `@datasieve/core` nor `@datasieve/query-language` ever need to know Prisma exists.

See `ROADMAP.md` and `CLAUDE.md` at the repo root for the architectural context. This package implements Milestone 3.

## Installation

```sh
npm install @datasieve/core @datasieve/prisma @prisma/client
```

`prisma`/`@prisma/client` are peer expectations of this package (you already have them if you're using Prisma) rather than bundled dependencies, so your project controls its own Prisma version.

## Setup

```ts
import { PrismaClient } from "@prisma/client";
import { createDataSieve } from "@datasieve/core";
import { prismaAdapter } from "@datasieve/prisma";

const prisma = new PrismaClient();
const sieve = createDataSieve({ adapter: prismaAdapter(prisma) });

const result = await sieve.query({
  resource: prisma.user,
  query: {
    where: { field: "status", op: "=", value: "ACTIVE" },
    sort: [{ field: "createdAt", direction: "desc" }],
    pagination: { kind: "offset", page: 1, pageSize: 20 },
  },
});
```

`resource` is any Prisma model delegate (`prisma.user`, `prisma.order`, ...) — one `sieve` instance can query every model in your schema.

## Supported features

| DSQL feature | Translation |
|---|---|
| Filtering (`where`), `and`/`or`/`not` | Prisma `where`, `AND`/`OR`/`NOT` |
| All operators except `childOf`/`parentOf` | Prisma's scalar filter objects (`equals`, `gt`, `in`, `contains`, ...) |
| Nested field paths through **to-one** relations | Nested `where`/`orderBy` objects |
| Sorting, incl. nested to-one paths | Prisma `orderBy` |
| Offset pagination | Prisma `skip`/`take`, with `total` from a `count()` run in the same `$transaction` as the page fetch |
| Cursor pagination | Prisma's native `cursor`/`skip`/`take` (signed for direction), with `hasNext`/`hasPrevious` detected via the standard "fetch one extra row" trick — no separate count query |
| `select` | Prisma `select` |
| `include`, incl. nested scoped `where`/`select`/`sort`/`include` | Prisma `include` — or folded into `select` if both are requested (see below) |
| Search | An `OR` of the search term against each requested field, `AND`-ed with `where` |
| `distinct` (explicit field list) | Prisma `distinct` |
| `groupBy` + `count`/`sum`/`avg`/`min`/`max` aggregations | Prisma `groupBy`, with results reshaped from `{_sum: {total: N}}` into the alias-keyed row DSQL's `AggregationNode.alias` promises |

## Known limitations

These are documented gaps, not silent wrong answers — each one either throws a clear error or is called out below so you know what to expect. All of them trace back to the same root cause: a `QueryAST` field path is a plain string with no attached schema/type information, so the adapter sometimes can't distinguish two cases that need different Prisma syntax.

- **Filtering/sorting through *to-many* relations** (e.g. `"orders.total"`) is not specially handled. Prisma requires `{ orders: { some: {...} } }` for this, not direct nesting, and DSQL currently has no way to express "some/every/none" quantification on a condition. Attempting it will surface Prisma's own `PrismaClientValidationError` rather than silently returning wrong results. A future DSQL revision could add an explicit relation quantifier to `Condition`/`SortField` to resolve this properly.
- **`contains` always assumes a string field.** DSQL's `contains` operator also means "array contains element" for scalar-list fields (Prisma's `has`), but the adapter can't tell the two apart from the AST alone, so only the string/substring case is translated.
- **`isNull`/`isNotNull` always use scalar semantics** (`equals: null` / `not: null`). Filtering an optional *to-one relation* for presence needs Prisma's `is`/`isNot: null` instead — not yet distinguished.
- **`ilike` / case-insensitive `search`** only emit Prisma's `mode: "insensitive"` when `prismaAdapter(prisma, { caseInsensitiveMode: true })` is set. This defaults to `false` because `mode` is Postgres/MySQL-only — SQLite's query engine rejects it outright. SQLite's own `LIKE` is already ASCII-case-insensitive, so `ilike` still behaves reasonably there without the option.
- **`having` only supports conditions on grouped fields**, not on aggregated values (e.g. `having: sum(total) > 1000`) — Prisma requires those wrapped per aggregation (`{ total: { _sum: { gt: 1000 } } }`), which needs `having` to reference an aggregation's alias. `GroupByInput.having` (in `@datasieve/query-language`) doesn't yet support that; see its TSDoc.
- **`distinct: true` requires an explicit `select`.** Prisma's `distinct` needs a concrete field list; DSQL's `distinct: true` ("distinct over the current selection") only has fields to use when `select` is also present. Without one, this throws rather than guessing.
- **Cursor pagination is not supported for grouped/aggregated queries** — throws a clear error. Prisma's `groupBy` supports `skip`/`take` (used for offset pagination on grouped queries) but not the same cursor mechanics as `findMany`.
- **Prisma enums** aren't used by this package's own test schema (SQLite doesn't support them in Prisma) — enum-like fields are plain `String`s in tests. This is a schema/provider choice; the adapter itself has no opinion on whether your model fields are enums or strings.

## Testing

This package's own tests run against a real SQLite database (see `prisma/schema.prisma`), not mocks — `pnpm test` runs `prisma generate`, resets and pushes the schema fresh, seeds a small fixed dataset once (`tests/global-setup.ts`), and then exercises the adapter directly and through `createDataSieve()` end to end.

## Extending

- **A new operator, or resolving one of the limitations above**: `src/translate/where.ts` (`translateOperator`) is the place to start; see `@datasieve/query-language`'s own extension notes for adding a new operator to DSQL first if it doesn't exist yet.
- **A different cursor field or id type**: `prismaAdapter(prisma, { cursorField: "myId", parseCursorValue: (raw) => Number(raw) })`.
