import type { DataSieveQuery, QueryAST } from "@razsdev/datasieve-query-language";
import type { AdapterExecuteResult } from "../adapter/adapter.js";
import type { DataSieveResponse } from "../response/response.js";

/** A value, or a promise of one — every plugin hook may be sync or async. */
export type Awaitable<T> = T | Promise<T>;

/**
 * Per-query, per-call scratch space threaded through every plugin hook
 * invocation for a single {@link DataSieveEngine.query} call. `state` lets
 * one hook stash something (e.g. a computed cache key) for a later hook
 * in the same call to read — it is not shared across separate queries.
 */
export interface DataSievePluginContext {
  /** The `resource` handle passed to `engine.query()`, e.g. a Prisma model delegate. */
  resource: unknown;
  /** Mutable scratch space for this query only. Plugins own their own keys. */
  state: Record<string, unknown>;
}

/**
 * A DataSieve plugin: a named bundle of optional lifecycle hooks that
 * observe or augment a query as it moves through Core's pipeline,
 * without the pipeline or any adapter needing special-case code for
 * them. This is what makes cross-cutting concerns — caching, soft
 * deletes, authorization, multi-tenancy — additive rather than changes
 * to Core or to every adapter.
 *
 * Every hook is optional; a plugin implements only the stages it cares
 * about. Hooks run in the plugin array's order, and a hook that returns
 * a value (rather than `void`) replaces its input for the next plugin in
 * line — see `pipeline/middleware.ts`'s `runHooks`.
 *
 * The query the user supplied is parsed and validated by
 * `@razsdev/datasieve-query-language` *before* any plugin sees it, so plugins
 * only ever operate on an already-valid query — they augment trusted
 * internal logic, they don't re-implement input validation.
 *
 * @example Soft delete
 * ```ts
 * const softDelete: DataSievePlugin = {
 *   name: "soft-delete",
 *   beforeNormalize(query) {
 *     return {
 *       ...query,
 *       where: query.where
 *         ? { and: [query.where, { field: "deletedAt", op: "isNull" }] }
 *         : { field: "deletedAt", op: "isNull" },
 *     };
 *   },
 * };
 * ```
 */
export interface DataSievePlugin {
  /** Plugin name, surfaced in error messages if the plugin throws. */
  name: string;
  /**
   * Runs after the user's query has been parsed and validated, before
   * it's normalized into a {@link QueryAST}. The natural place to inject
   * or rewrite filters (soft delete, tenancy, authorization scoping).
   */
  beforeNormalize?<T>(query: DataSieveQuery<T>, ctx: DataSievePluginContext): Awaitable<DataSieveQuery<T> | void>;
  /**
   * Runs after normalization, immediately before the adapter executes
   * the query. Useful for AST-level bookkeeping (e.g. computing a cache
   * key from the final, normalized shape of the query).
   */
  beforeExecute?(ast: QueryAST, ctx: DataSievePluginContext): Awaitable<QueryAST | void>;
  /**
   * Runs after the adapter returns raw results, before Core builds the
   * standardized response. Useful for observing/recording results (e.g.
   * populating a cache) without altering the response shape.
   */
  afterExecute?(result: AdapterExecuteResult, ctx: DataSievePluginContext): Awaitable<AdapterExecuteResult | void>;
  /**
   * Runs after Core builds the final {@link DataSieveResponse}, immediately
   * before it's returned to the caller. The last chance to adjust the
   * response (e.g. redacting fields, annotating `meta`).
   */
  afterTransform?<T>(response: DataSieveResponse<T>, ctx: DataSievePluginContext): Awaitable<DataSieveResponse<T> | void>;
  /**
   * Notified when any pipeline stage throws (parse/validate errors from
   * `@razsdev/datasieve-query-language`, adapter errors, or another plugin's
   * hook throwing). Purely an observer — throwing here does not change
   * or suppress the original error, which is always rethrown after every
   * plugin's `onError` has run.
   */
  onError?(error: unknown, ctx: DataSievePluginContext): Awaitable<void>;
}
