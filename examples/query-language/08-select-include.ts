/**
 * Field selection and relation inclusion, Prisma-style. `select` covers
 * `User`'s scalar fields; relations (`profile`, `orders`) are eagerly
 * loaded through `include` instead, each with its own scoped query.
 */
import type { DataSieveQuery } from "@datasieve/query-language";
import type { User } from "./domain.js";

const query: DataSieveQuery<User> = {
  select: { id: true, name: true, email: true },
  include: {
    profile: true,
    orders: {
      where: { field: "status", op: "=", value: "PAID" },
      select: { id: true, total: true },
      sort: [{ field: "createdAt", direction: "desc" }],
    },
  },
};

// Nested includes can themselves scope further nested includes (depth-limited).
const nested: DataSieveQuery<User> = {
  include: {
    orders: {
      include: {},
    },
  },
};

export { query, nested };
