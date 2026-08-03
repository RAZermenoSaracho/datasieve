/**
 * A fully composed query touching every major DSQL feature at once —
 * this is the object that flows from an application, through
 * `parseQuery`/`validateQuery`, into `normalizeQuery`, and out as a
 * `QueryAST` for an adapter to execute.
 */
import { normalizeQuery, parseQuery, validateQuery, type DataSieveQuery } from "@razsdev/datasieve-query-language";
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
  search: { value: "acme", mode: "contains", fields: ["name", "email"] },
  sort: [{ field: "createdAt", direction: "desc" }],
  pagination: { kind: "offset", page: 1, pageSize: 20 },
  select: { id: true, name: true, email: true },
  include: { orders: { select: { id: true, total: true } } },
  distinct: ["id"],
};

// The end-to-end pipeline: untrusted input -> parsed -> validated -> AST.
function handleIncomingQuery(raw: unknown) {
  const parsed = parseQuery<User>(raw);
  if (!parsed.success) {
    return { ok: false as const, issues: parsed.issues };
  }

  const validation = validateQuery(parsed.data);
  if (!validation.valid) {
    return { ok: false as const, issues: validation.issues };
  }

  const ast = normalizeQuery(parsed.data);
  return { ok: true as const, ast };
}

export { query, handleIncomingQuery };
