# @datasieve/query-language

DSQL — the DataSieve Query Language. The public, database-agnostic language every DataSieve application writes and every adapter consumes.

This package implements **only the language**: types, operator definitions, and skeleton parse/normalize/validate functions. It has no adapters, no execution, no Prisma/SQL/Mongo/Elasticsearch knowledge whatsoever — see `CLAUDE.md` at the repo root for the full architectural context.

## Concepts

DSQL describes **what** data is wanted, never **how** to retrieve it, and is philosophically inspired by [Odoo Domains](https://www.odoo.com/documentation/19.0/applications/essentials/search.html): declarative, nestable filter trees over field paths — modernized as inferred TypeScript rather than Odoo's own syntax.

- **`DataSieveQuery<T>`** — the root, public type. Every field is optional. Given a plain TypeScript type `T` for your resource, DSQL infers valid field paths, operators, and value types entirely from `T`'s shape.
- **`WhereInput<T>` / `Condition<T>`** — the filter tree: `and`/`or`/`not` nested to unbounded depth around leaf conditions (`{ field, op, value }`). `field` autocompletes over every dot-notation path on `T` (including through nested objects and arrays); `op` is narrowed to what's valid for that field's type; `value`'s shape follows `op`.
- **`SearchInput<T>`** — free-text search, independent from `where`.
- **`SortInput<T>`**, **`PaginationInput`** (offset or cursor), **`SelectInput<T>`**, **`IncludeInput<T>`**, **`GroupByInput<T>`**, **`AggregationInput<T>`** — the rest of the query surface.
- **`QueryAST`** — the internal, string-keyed normalized representation adapters actually consume. `normalizeQuery` is the one-way bridge from the typed public API to this AST; see `ast/query-ast.ts` for why the two are deliberately different shapes.

## Pipeline

```
raw input --parseQuery--> DataSieveQuery<T> --validateQuery--> DataSieveQuery<T> --normalizeQuery--> QueryAST
```

`parseQuery` and `validateQuery` are intentionally **skeletons**: they check gross shape and structural consistency, not that a field path exists on `T` or that a value's runtime type is correct (schema-aware validation is a separate, future plugin per `CLAUDE.md`). `normalizeQuery` is fully implemented for every current feature.

## Examples

See `examples/query-language/` at the repo root for one file per major feature (filtering, logical nesting, nested field paths, search, sort, offset/cursor pagination, select/include, grouping/aggregation, and a fully composed query).

## Extending

- **New operator**: `src/operators/operator-types.ts` (type rules) + `src/operators/operators.ts` (runtime metadata). See that file's header comment for the exact steps.
- **New AST node / query feature**: add the public type, add the matching AST node in `src/ast/nodes.ts`, wire it into `QueryAST` and `normalizeQuery`.
