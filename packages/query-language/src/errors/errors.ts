/** A single structured problem found while parsing or validating a query. */
export interface DataSieveIssue {
  /** Dot-notation path within the query object where the issue was found (e.g. `"where.and.0.value"`). */
  path: string;
  /** Human-readable description of the issue. */
  message: string;
  /** Stable, machine-checkable identifier for the issue kind (e.g. `"UNKNOWN_FIELD"`). */
  code: string;
}

/** Base class for every error this package throws. */
export class DataSieveError extends Error {
  readonly issues: DataSieveIssue[];

  constructor(message: string, issues: DataSieveIssue[] = []) {
    super(message);
    this.name = "DataSieveError";
    this.issues = issues;
  }
}

/** Thrown by {@link parseQuery} when raw input cannot be interpreted as a query at all. */
export class ParseError extends DataSieveError {
  constructor(message: string, issues: DataSieveIssue[] = []) {
    super(message, issues);
    this.name = "ParseError";
  }
}

/** Thrown or returned (see {@link ValidationResult}) when a well-formed query fails semantic checks. */
export class QueryValidationError extends DataSieveError {
  constructor(message: string, issues: DataSieveIssue[] = []) {
    super(message, issues);
    this.name = "QueryValidationError";
  }
}
