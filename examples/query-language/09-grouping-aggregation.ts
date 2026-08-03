/**
 * Grouping and aggregation. These are designed now and reserved in both
 * the public API and the internal AST, per the DSQL brief — adapters are
 * not required to execute them yet, but the shape is stable so a future
 * adapter release won't need a breaking change here.
 */
import type { DataSieveQuery } from "@razsdev/datasieve-query-language";
import type { Order } from "./domain.js";

const revenueByStatus: DataSieveQuery<Order> = {
  groupBy: { fields: ["status"] },
  aggregations: [
    { fn: "count", alias: "orderCount" },
    { fn: "sum", field: "total", alias: "revenue" },
    { fn: "avg", field: "total", alias: "averageOrderValue" },
  ],
};

// `having` filters the grouped results, analogous to SQL's HAVING.
const highValueGroups: DataSieveQuery<Order> = {
  groupBy: {
    fields: ["status"],
    having: { field: "total", op: ">", value: 1000 },
  },
  aggregations: [{ fn: "max", field: "total", alias: "maxOrderTotal" }],
};

export { revenueByStatus, highValueGroups };
