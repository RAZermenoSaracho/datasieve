/**
 * Free-text search: independent from `where`, and restricted at the type
 * level to string-valued fields only.
 */
import type { DataSieveQuery } from "@datasieve/query-language";
import type { User } from "./domain.js";

const query: DataSieveQuery<User> = {
  search: {
    value: "john",
    mode: "contains",
    fields: ["name", "email"],
  },
};

// Search and structured filtering compose freely.
const activeJohns: DataSieveQuery<User> = {
  where: { field: "status", op: "=", value: "ACTIVE" },
  search: { value: "john", mode: "startsWith", fields: ["name"] },
};

export { query, activeJohns };
