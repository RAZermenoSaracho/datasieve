/**
 * Nested field references: dot-notation paths into related objects and
 * arrays, inferred entirely from `User`'s shape — no join is ever named.
 */
import type { DataSieveQuery } from "@datasieve/query-language";
import type { User } from "./domain.js";

const query: DataSieveQuery<User> = {
  where: {
    and: [
      { field: "profile.company.name", op: "=", value: "Acme Inc" },
      { field: "orders.total", op: ">", value: 100 },
    ],
  },
};

// The collection itself is also addressable, independent of its elements —
// useful with existence-style operators.
const usersWithOrders: DataSieveQuery<User> = {
  where: { field: "orders", op: "exists" },
};

const usersWithNoOrders: DataSieveQuery<User> = {
  where: { field: "orders", op: "notExists" },
};

export { query, usersWithOrders, usersWithNoOrders };
