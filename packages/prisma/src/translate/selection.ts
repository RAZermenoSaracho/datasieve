import type { RelationNode, SelectionNode } from "@razsdev/datasieve-query-language";
import type { TranslateOptions } from "./options.js";
import { translateSort } from "./sort.js";
import { translateFilter } from "./where.js";

/**
 * The `select`/`include` piece of a Prisma query. Prisma forbids using
 * both at the same query level, so exactly one of these is ever set —
 * see {@link buildSelection}.
 */
export interface PrismaSelection {
  select?: Record<string, unknown>;
  include?: Record<string, unknown>;
}

/**
 * Combines DSQL's `selection` (scalar field picks) and `relations`
 * (eager-loaded relations, each with their own scoped `where`/`select`/
 * `sort`/nested `relations`) into Prisma's `select`/`include` shape.
 *
 * Prisma disallows `select` and `include` together at the same level,
 * but *does* allow relation keys inside `select` (each with their own
 * nested options) — so when both a scalar selection and relations are
 * requested, the relations are folded into `select` rather than kept as
 * a separate `include`. When there's no scalar selection, the relations
 * (if any) are returned as `include` instead.
 *
 * @example Both select and include requested
 * ```ts
 * buildSelection(
 *   { fields: ["id", "name"] },
 *   [{ field: "orders", filter: null, selection: null, sort: [], relations: [] }],
 *   { caseInsensitiveMode: false },
 * );
 * // -> { select: { id: true, name: true, orders: true } }
 * ```
 */
export function buildSelection(
  selection: SelectionNode | null,
  relations: readonly RelationNode[],
  options: TranslateOptions,
): PrismaSelection {
  const include = translateRelations(relations, options);

  if (selection && selection.fields.length > 0) {
    const select: Record<string, unknown> = {};
    for (const field of selection.fields) select[field] = true;
    if (include) Object.assign(select, include);
    return { select };
  }

  return include ? { include } : {};
}

function translateRelations(relations: readonly RelationNode[], options: TranslateOptions): Record<string, unknown> | undefined {
  if (relations.length === 0) return undefined;

  const include: Record<string, unknown> = {};
  for (const relation of relations) {
    const hasScoping =
      relation.filter !== null ||
      relation.selection !== null ||
      relation.sort.length > 0 ||
      relation.relations.length > 0;

    if (!hasScoping) {
      include[relation.field] = true;
      continue;
    }

    const nested = buildSelection(relation.selection, relation.relations, options);
    include[relation.field] = {
      where: translateFilter(relation.filter, options),
      orderBy: relation.sort.length > 0 ? translateSort(relation.sort) : undefined,
      ...nested,
    };
  }
  return include;
}
