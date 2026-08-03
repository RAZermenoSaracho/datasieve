/**
 * Cursor pagination: stable pagination over large/mutating datasets.
 * `cursor` is opaque — DSQL never inspects or constructs it, it's simply
 * threaded through from a prior response's `meta` back into the next
 * query. Both pagination strategies share the same `pagination` field and
 * the same standardized response contract (see `CLAUDE.md`), so switching
 * between them is not a breaking change for a consumer.
 */
import type { DataSieveQuery } from "@razsdev/datasieve-query-language";
import type { User } from "./domain.js";

const firstPage: DataSieveQuery<User> = {
  pagination: { kind: "cursor", take: 25 },
};

const nextPage: DataSieveQuery<User> = {
  pagination: { kind: "cursor", cursor: "eyJpZCI6NDJ9", take: 25 },
};

const previousPage: DataSieveQuery<User> = {
  pagination: { kind: "cursor", cursor: "eyJpZCI6NDJ9", take: 25, direction: "backward" },
};

export { firstPage, nextPage, previousPage };
