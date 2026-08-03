/**
 * Sorting: an ordered list of sort instructions, single or multi-key,
 * over any field path (including nested ones).
 */
import type { DataSieveQuery } from "@razsdev/datasieve-query-language";
import type { User } from "./domain.js";

const singleKey: DataSieveQuery<User> = {
  sort: [{ field: "createdAt", direction: "desc" }],
};

const multiKey: DataSieveQuery<User> = {
  sort: [
    { field: "createdAt", direction: "desc" },
    { field: "name", direction: "asc" },
  ],
};

const nestedField: DataSieveQuery<User> = {
  sort: [{ field: "profile.company.name", direction: "asc", nulls: "last" }],
};

export { singleKey, multiKey, nestedField };
