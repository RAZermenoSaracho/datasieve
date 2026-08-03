import {
  normalizeQuery,
  parseQuery,
  ParseError,
  QueryValidationError,
  validateQuery,
  type DataSieveQuery,
  type PaginationInput,
  type QueryAST,
} from "@razsdev/datasieve-query-language";
import type { AdapterExecuteResult, DataSieveAdapter } from "../adapter/adapter.js";
import { DataSieveExecutionError } from "../errors/errors.js";
import type { DataSievePlugin, DataSievePluginContext } from "../plugin/plugin.js";
import { buildResponse } from "../response/build-response.js";
import type { DataSieveResponse } from "../response/response.js";
import { runHooks, type PipelineHook } from "./middleware.js";

/** Input to {@link executeQuery} — everything one `engine.query()` call needs. */
export interface ExecuteQueryOptions<TResource> {
  adapter: DataSieveAdapter<TResource>;
  plugins: readonly DataSievePlugin[];
  resource: TResource;
  /** Untrusted input — see `@razsdev/datasieve-query-language`'s `parseQuery`. */
  query: unknown;
  /** Applied when the query omits `pagination`. */
  defaultPageSize: number;
}

/**
 * Runs the full DataSieve pipeline for one query:
 *
 * ```
 * parse -> validate -> [beforeNormalize plugins] -> normalize
 *       -> [beforeExecute plugins] -> adapter.execute
 *       -> [afterExecute plugins] -> buildResponse
 *       -> [afterTransform plugins] -> return
 * ```
 *
 * This is the function `createDataSieve()`'s returned engine calls for
 * every `query()` invocation; it exists as a standalone function (rather
 * than inlined into the engine) so the pipeline itself — independent of
 * how an engine instance is constructed — is directly testable.
 *
 * Parse/validation failures come from `@razsdev/datasieve-query-language`
 * untouched (`ParseError`/`QueryValidationError`) and are never seen by
 * the adapter. Adapter failures are wrapped in
 * {@link DataSieveExecutionError}. Either way, every plugin's `onError`
 * is notified (best-effort — a throwing `onError` never suppresses or
 * replaces the original error) before it's rethrown.
 */
export async function executeQuery<T, TResource>(
  options: ExecuteQueryOptions<TResource>,
): Promise<DataSieveResponse<T>> {
  const { adapter, plugins, resource, query, defaultPageSize } = options;
  const ctx: DataSievePluginContext = { resource, state: {} };

  try {
    const parsed = parseQuery<T>(query);
    if (!parsed.success) {
      throw new ParseError("Query failed to parse.", parsed.issues);
    }

    const validation = validateQuery(parsed.data);
    if (!validation.valid) {
      throw new QueryValidationError("Query failed validation.", validation.issues);
    }

    const queryWithDefaults: DataSieveQuery<T> = {
      ...parsed.data,
      pagination: applyDefaultPagination(parsed.data.pagination, defaultPageSize),
    };

    // Cast: `beforeNormalize` is generic per plugin invocation (it must work for
    // any T a plugin is used with); pinning it to this call's concrete T is
    // exactly correct, but TS can't correlate that through a bare `.map()`.
    const beforeNormalizeHooks = plugins.map((plugin) => plugin.beforeNormalize) as Array<
      PipelineHook<DataSieveQuery<T>> | undefined
    >;
    const queryAfterPlugins = await runHooks(beforeNormalizeHooks, queryWithDefaults, ctx);

    const ast = normalizeQuery(queryAfterPlugins);
    const astAfterPlugins = await runHooks(
      plugins.map((plugin) => plugin.beforeExecute),
      ast,
      ctx,
    );

    const result = await executeAdapter(adapter, astAfterPlugins, resource);
    const resultAfterPlugins = await runHooks(
      plugins.map((plugin) => plugin.afterExecute),
      result.result,
      ctx,
    );

    const pagination = applyDefaultPagination(astAfterPlugins.pagination, defaultPageSize);
    const response = buildResponse<T>(resultAfterPlugins, pagination, result.executionTime);

    const afterTransformHooks = plugins.map((plugin) => plugin.afterTransform) as Array<
      PipelineHook<DataSieveResponse<T>> | undefined
    >;
    return await runHooks(afterTransformHooks, response, ctx);
  } catch (error) {
    await notifyOnError(plugins, error, ctx);
    throw error;
  }
}

async function executeAdapter<TResource>(
  adapter: DataSieveAdapter<TResource>,
  ast: QueryAST,
  resource: TResource,
): Promise<{ result: AdapterExecuteResult; executionTime: number }> {
  const start = Date.now();
  try {
    const result = await adapter.execute(ast, resource);
    return { result, executionTime: Date.now() - start };
  } catch (error) {
    throw new DataSieveExecutionError(adapter.name, error);
  }
}

async function notifyOnError(
  plugins: readonly DataSievePlugin[],
  error: unknown,
  ctx: DataSievePluginContext,
): Promise<void> {
  // Each call is wrapped in its own async function so a *synchronously*
  // throwing onError becomes a rejected promise here, rather than
  // throwing straight out of `.map()` before `Promise.allSettled` even
  // runs — which would replace the original error we're about to rethrow.
  await Promise.allSettled(
    plugins.map(async (plugin) => {
      await plugin.onError?.(error, ctx);
    }),
  );
}

function applyDefaultPagination(
  pagination: PaginationInput | null | undefined,
  defaultPageSize: number,
): PaginationInput {
  return pagination ?? { kind: "offset", page: 1, pageSize: defaultPageSize };
}
