/**
 * Offset pagination: page-number based, the common REST/UI-facing shape.
 */
import type { DataSieveQuery } from "@razsdev/datasieve-query-language";
import type { User } from "./domain.js";

const query: DataSieveQuery<User> = {
  pagination: { kind: "offset", page: 2, pageSize: 25 },
};

export { query };
