/**
 * @packageDocumentation
 *
 * `@datasieve/core` — the DataSieve query engine.
 *
 * This package turns a `DataSieveQuery` (from `@datasieve/query-language`)
 * into a standardized `DataSieveResponse`, by way of one storage adapter
 * and any number of plugins — without ever knowing what kind of storage
 * answered the query. It contains the adapter contract, the execution
 * pipeline, the plugin/middleware system, and the response contract.
 * It contains no adapters of its own (see `@datasieve/prisma` and future
 * adapter packages) beyond the reference in-memory adapter under
 * `testing/`, which exists to prove and test this package, not to be a
 * production adapter.
 *
 * Start with {@link createDataSieve}.
 */

// Engine
export { createDataSieve } from "./engine/create-data-sieve.js";
export type { CreateDataSieveOptions, DataSieveEngine, DataSieveQueryInput } from "./engine/create-data-sieve.js";

// Adapter contract
export type { AdapterExecuteResult, DataSieveAdapter } from "./adapter/adapter.js";

// Plugin contract
export type { Awaitable, DataSievePlugin, DataSievePluginContext } from "./plugin/plugin.js";

// Pipeline (exposed for direct testing / advanced composition)
export { runHooks } from "./pipeline/middleware.js";
export type { PipelineHook } from "./pipeline/middleware.js";
export { executeQuery } from "./pipeline/execute.js";
export type { ExecuteQueryOptions } from "./pipeline/execute.js";

// Response contract
export { buildResponse } from "./response/build-response.js";
export type { DataSieveResponse, DataSieveResponseCursor, DataSieveResponseMeta } from "./response/response.js";

// Errors
export { DataSieveExecutionError } from "./errors/errors.js";

// Reference in-memory adapter (for testing Core, and for consumers' own tests)
export { createMemoryAdapter } from "./testing/memory-adapter.js";
export type { MemoryAdapterOptions } from "./testing/memory-adapter.js";

// Convenience re-exports from @datasieve/query-language — the types most
// consumers of this package need are re-exported here so a typical
// application only needs to import from @datasieve/core.
export {
  DataSieveError,
  normalizeQuery,
  ParseError,
  parseQuery,
  QueryValidationError,
  validateQuery,
} from "@datasieve/query-language";
export type { DataSieveIssue, DataSieveQuery, ParseResult, QueryAST, ValidationResult } from "@datasieve/query-language";
