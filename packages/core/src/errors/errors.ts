/**
 * Thrown when a {@link DataSieveAdapter}'s `execute` rejects. Wraps the
 * original error as `cause` and records which adapter failed, so
 * application error handling can distinguish "the query was malformed"
 * (a `ParseError`/`QueryValidationError` from `@datasieve/query-language`,
 * thrown before any adapter is ever reached) from "a well-formed query
 * failed to execute" (this error).
 */
export class DataSieveExecutionError extends Error {
  /** The `name` of the adapter that threw. */
  readonly adapterName: string;

  constructor(adapterName: string, cause: unknown) {
    super(`Adapter "${adapterName}" failed to execute query: ${describeCause(cause)}`, { cause });
    this.name = "DataSieveExecutionError";
    this.adapterName = adapterName;
  }
}

function describeCause(cause: unknown): string {
  return cause instanceof Error ? cause.message : String(cause);
}
