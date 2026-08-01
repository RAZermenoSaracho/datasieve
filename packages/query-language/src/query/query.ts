import type { AggregationInput } from "../aggregation/aggregation.js";
import type { ComputedFieldsInput } from "../computed/computed.js";
import type { FieldPath } from "../fields/field-path.js";
import type { WhereInput } from "../filter/where.js";
import type { GroupByInput } from "../grouping/group-by.js";
import type { PaginationInput } from "../pagination/pagination.js";
import type { SearchInput } from "../search/search.js";
import type { IncludeInput } from "../selection/include.js";
import type { SelectInput } from "../selection/select.js";
import type { SortInput } from "../sort/sort.js";

/**
 * DSQL: the DataSieve Query Language. This is the public, database-agnostic
 * shape every application writes and every adapter consumes — it never
 * exposes SQL, Prisma, Mongo, or any other storage-specific concept.
 *
 * A `DataSieveQuery<T>` describes **what** data is wanted, never **how**
 * to retrieve it. Every field is optional; an empty `{}` requests
 * everything, unfiltered, unsorted, unpaginated (adapters may still apply
 * a default page size).
 *
 * `T` is the plain TypeScript shape of the resource being queried (e.g.
 * a `User` interface) — DSQL infers field names, nested paths, and valid
 * operators/value-types entirely from `T`, so this object needs no
 * generics or casts beyond the one on `DataSieveQuery` itself.
 *
 * @example Full composed query
 * ```ts
 * interface User {
 *   id: string;
 *   name: string;
 *   email: string;
 *   status: "ACTIVE" | "INACTIVE";
 *   country: string;
 *   createdAt: Date;
 *   profile: { company: { name: string } };
 *   orders: { id: string; total: number; status: string }[];
 * }
 *
 * const query: DataSieveQuery<User> = {
 *   where: {
 *     and: [
 *       { field: "status", op: "=", value: "ACTIVE" },
 *       { or: [
 *           { field: "country", op: "=", value: "MX" },
 *           { field: "country", op: "=", value: "US" },
 *         ] },
 *     ],
 *   },
 *   search: { value: "acme", mode: "contains", fields: ["name", "email"] },
 *   sort: [{ field: "createdAt", direction: "desc" }],
 *   pagination: { kind: "offset", page: 1, pageSize: 20 },
 *   select: { id: true, name: true, email: true },
 *   include: { orders: { select: { id: true, total: true } } },
 * };
 * ```
 */
export interface DataSieveQuery<T> {
  /** Nested boolean filter tree. See {@link WhereInput}. */
  where?: WhereInput<T>;
  /** Free-text search, independent from `where`. See {@link SearchInput}. */
  search?: SearchInput<T>;
  /** Ordered multi-key sort. See {@link SortInput}. */
  sort?: SortInput<T>;
  /** Offset- or cursor-based pagination. See {@link PaginationInput}. */
  pagination?: PaginationInput;
  /** Which scalar fields to return. Omit to return all scalar fields. See {@link SelectInput}. */
  select?: SelectInput<T>;
  /** Which relations to eagerly load, and how. See {@link IncludeInput}. */
  include?: IncludeInput<T>;
  /**
   * Restrict results to distinct rows, optionally over a specific set of
   * fields (`true` = distinct over the full selection).
   */
  distinct?: FieldPath<T>[] | boolean;
  /** Group results by one or more fields. See {@link GroupByInput}. */
  groupBy?: GroupByInput<T>;
  /** Aggregate functions to compute, typically alongside `groupBy`. See {@link AggregationInput}. */
  aggregations?: AggregationInput<T>[];
  /** Reserved extension point for virtual/computed fields. See {@link ComputedFieldsInput}. */
  computed?: ComputedFieldsInput;
}
