/**
 * Logical operators: `and`/`or`/`not` nest to unbounded depth, exactly
 * matching the shape from the DSQL design brief.
 */
import type { DataSieveQuery } from "@datasieve/query-language";
import type { User } from "./domain.js";

const query: DataSieveQuery<User> = {
  where: {
    and: [
      { field: "status", op: "=", value: "ACTIVE" },
      {
        or: [
          { field: "country", op: "=", value: "MX" },
          { field: "country", op: "=", value: "US" },
        ],
      },
      { not: { field: "deletedAt", op: "isNotNull" } },
    ],
  },
};

// Nesting is unbounded: and/or/not can contain each other arbitrarily deep.
const deeplyNested: DataSieveQuery<User> = {
  where: {
    or: [
      { and: [{ field: "status", op: "=", value: "ACTIVE" }, { not: { or: [{ field: "age", op: "<", value: 18 }] } }] },
      { field: "status", op: "=", value: "INACTIVE" },
    ],
  },
};

export { query, deeplyNested };
