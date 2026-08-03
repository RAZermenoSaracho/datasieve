import type { DataSieveAdapter } from "../adapter/adapter.js";
import type { DataSievePlugin } from "../plugin/plugin.js";
import { executeQuery } from "../pipeline/execute.js";
import type { DataSieveResponse } from "../response/response.js";

const DEFAULT_PAGE_SIZE = 20;

/** Options accepted by {@link createDataSieve}. */
export interface CreateDataSieveOptions<TResource = unknown> {
  /** The storage adapter this engine executes queries against. */
  adapter: DataSieveAdapter<TResource>;
  /** Plugins run, in order, at each pipeline stage. Defaults to none. */
  plugins?: DataSievePlugin[];
  /** Page size applied when a query omits `pagination`. Defaults to 20. */
  defaultPageSize?: number;
}

/** Input to {@link DataSieveEngine.query}. */
export interface DataSieveQueryInput<TResource> {
  /** The resource to query, in whatever shape the bound adapter expects (e.g. a Prisma model delegate). */
  resource: TResource;
  /** Untrusted query input — typically a decoded request body/query string. */
  query: unknown;
}

/**
 * A configured DataSieve engine: one adapter and one set of plugins,
 * ready to run any number of queries against any resource that adapter
 * understands.
 */
export interface DataSieveEngine<TResource = unknown> {
  /** Run one query end to end — parse, validate, normalize, execute, respond. See `pipeline/execute.ts`. */
  query<T>(input: DataSieveQueryInput<TResource>): Promise<DataSieveResponse<T>>;
}

/**
 * Creates a DataSieve engine bound to one adapter and plugin set. This is
 * the package's main entry point — everything else in `@razsdev/datasieve-core`
 * exists in service of making this one function's contract (adapter in,
 * standardized responses out) hold for any storage technology.
 *
 * @example
 * ```ts
 * const engine = createDataSieve({
 *   adapter: myAdapter,
 *   plugins: [softDeletePlugin],
 * });
 *
 * const result = await engine.query<User>({
 *   resource: prisma.user,
 *   query: request.query,
 * });
 * ```
 */
export function createDataSieve<TResource = unknown>(
  options: CreateDataSieveOptions<TResource>,
): DataSieveEngine<TResource> {
  const { adapter, plugins = [], defaultPageSize = DEFAULT_PAGE_SIZE } = options;

  return {
    query<T>(input: DataSieveQueryInput<TResource>) {
      return executeQuery<T, TResource>({
        adapter,
        plugins,
        resource: input.resource,
        query: input.query,
        defaultPageSize,
      });
    },
  };
}
