import type { ConditionNode, FilterNode, Operator } from "@razsdev/datasieve-query-language";
import { nestPath } from "./path.js";
import type { TranslateOptions } from "./options.js";

/**
 * Translates a DSQL {@link FilterNode} tree into a Prisma `where` object.
 * `and`/`or`/`not` map directly onto Prisma's `AND`/`OR`/`NOT`; a leaf
 * `condition` node resolves its dot-path field with {@link nestPath} and
 * its operator with {@link translateOperator}.
 *
 * Returns `undefined` for a `null` filter (Prisma treats an absent
 * `where` the same as an unconstrained query) so callers can spread it
 * in without an extra `?? {}` at every call site.
 *
 * @example
 * ```ts
 * translateFilter({
 *   type: "and",
 *   nodes: [
 *     { type: "condition", field: "status", op: "=", value: "ACTIVE" },
 *     { type: "condition", field: "profile.region", op: "=", value: "west" },
 *   ],
 * }, { caseInsensitiveMode: false });
 * // -> { AND: [{ status: { equals: "ACTIVE" } }, { profile: { region: { equals: "west" } } }] }
 * ```
 */
export function translateFilter(node: FilterNode | null, options: TranslateOptions): Record<string, unknown> | undefined {
  if (!node) return undefined;
  switch (node.type) {
    case "and":
      return { AND: node.nodes.map((child) => translateFilter(child, options)) };
    case "or":
      return { OR: node.nodes.map((child) => translateFilter(child, options)) };
    case "not":
      return { NOT: translateFilter(node.node, options) };
    case "condition":
      return translateCondition(node, options);
  }
}

function translateCondition(node: ConditionNode, options: TranslateOptions): Record<string, unknown> {
  return nestPath(node.field.split("."), translateOperator(node.op, node.value, options));
}

/**
 * Translates one DSQL {@link Operator} + value into a Prisma scalar
 * filter object (the value nested under a field by {@link nestPath}).
 *
 * See the package README's "Known limitations" section for two
 * operators translated with narrower scope than DSQL allows: `contains`
 * always assumes a string field (Prisma's scalar-list `has` isn't
 * distinguished, since the AST carries no field-type information), and
 * `isNull`/`isNotNull` always use scalar `equals`/`not: null` rather than
 * relation `is`/`isNot` semantics.
 */
export function translateOperator(op: Operator, value: unknown, options: TranslateOptions): unknown {
  switch (op) {
    case "=":
      return { equals: value };
    case "!=":
      return { not: value };
    case ">":
      return { gt: value };
    case ">=":
      return { gte: value };
    case "<":
      return { lt: value };
    case "<=":
      return { lte: value };
    case "in":
      return { in: value };
    case "notIn":
      return { notIn: value };
    case "like":
      return { contains: value };
    case "ilike":
      return options.caseInsensitiveMode ? { contains: value, mode: "insensitive" } : { contains: value };
    case "contains":
      return { contains: value };
    case "startsWith":
      return { startsWith: value };
    case "endsWith":
      return { endsWith: value };
    case "between": {
      const [min, max] = value as readonly [unknown, unknown];
      return { gte: min, lte: max };
    }
    case "isNull":
      return { equals: null };
    case "isNotNull":
      return { not: null };
    case "exists":
      return { some: {} };
    case "notExists":
      return { none: {} };
    case "childOf":
    case "parentOf":
      throw new Error(`@razsdev/datasieve-prisma does not support the reserved "${op}" operator.`);
  }
}
