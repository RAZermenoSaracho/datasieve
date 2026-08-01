import type { QueryAST } from "@datasieve/query-language";

/**
 * What an adapter reports back after executing a {@link QueryAST}.
 *
 * Deliberately minimal: an adapter only reports raw rows plus whatever
 * pagination bookkeeping it can cheaply provide. Everything else a
 * response needs (`hasNext`, `hasPrevious`, `pageCount`, defaulted
 * pagination, timing) is computed once, centrally, by Core's
 * `buildResponse` — so every adapter author doesn't have to reimplement
 * that math. See `response/build-response.ts`.
 */
export interface AdapterExecuteResult<TRaw = unknown> {
  /** The raw rows matched by the query, in the storage technology's own shape. */
  data: TRaw[];
  /**
   * Total number of records matching the filter, ignoring pagination.
   * Omit when counting is expensive or unsupported for this query (e.g.
   * some cursor-based setups intentionally skip a COUNT for performance)
   * — Core will report `meta.total` as `null` rather than guess.
   */
  total?: number;
  /** Opaque cursor for the next page, if there is one. `null` means "no next page." */
  nextCursor?: string | null;
  /** Opaque cursor for the previous page, if there is one. `null` means "no previous page." */
  previousCursor?: string | null;
}

/**
 * The contract every DataSieve adapter implements. This is the seam
 * described in `CLAUDE.md`'s golden rules: Core depends on this
 * interface, never on any concrete adapter, and an adapter depends on
 * this interface, never on Core's internals.
 *
 * An adapter's only job is translating an already-normalized
 * {@link QueryAST} into calls against one storage technology and
 * reporting raw results back — it never sees the public,
 * `T`-generic `DataSieveQuery`, and Core never sees anything
 * storage-specific.
 *
 * `TResource` is deliberately opaque to Core: for a Prisma adapter it
 * might be a Prisma model delegate (`prisma.user`); for the reference
 * {@link createMemoryAdapter}, it's unused (the records are captured at
 * adapter-creation time instead). Core only ever passes it through.
 *
 * @example
 * ```ts
 * const adapter: DataSieveAdapter<Order[]> = {
 *   name: "example",
 *   async execute(ast, resource) {
 *     // ast.filter, ast.sort, ast.pagination, ... -> storage-specific query
 *     return { data: resource, total: resource.length };
 *   },
 * };
 * ```
 */
export interface DataSieveAdapter<TResource = unknown, TRaw = unknown> {
  /** Adapter name, surfaced in error messages (e.g. `DataSieveExecutionError`). */
  name: string;
  /** Execute a normalized query against `resource` and return raw results. */
  execute(ast: QueryAST, resource: TResource): Promise<AdapterExecuteResult<TRaw>>;
}
