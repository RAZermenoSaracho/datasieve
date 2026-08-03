/**
 * Turns a dot-notation field path and a leaf value into Prisma's nested
 * object shape: `nestPath(["profile", "region"], leaf)` produces
 * `{ profile: { region: leaf } }`.
 *
 * This is correct Prisma syntax for scalar fields and **to-one**
 * relations. It is shared by `where` and `orderBy` translation (see
 * `translate/where.ts` and `translate/sort.ts`) since both need the same
 * dot-path-to-nested-object shape, just with a different kind of leaf
 * (a filter object for `where`, `"asc"`/`"desc"` for `orderBy`).
 *
 * It is **not** correct for **to-many** relations, where Prisma requires
 * `{ relation: { some: {...} } }` rather than direct nesting. This
 * function doesn't attempt to detect relation cardinality — DSQL's
 * `QueryAST` carries plain field-path strings with no schema/type
 * information attached, so there's nothing here to detect it *from*.
 * Attempting to filter/sort through a to-many relation will pass the
 * (incorrect, for that case) direct-nesting shape to Prisma, which
 * rejects it with a clear `PrismaClientValidationError` rather than
 * silently returning wrong results. See the package README's
 * "Known limitations" section.
 */
export function nestPath(segments: readonly string[], leaf: unknown): Record<string, unknown> {
  const [head, ...rest] = segments;
  if (head === undefined) {
    throw new Error("nestPath requires at least one path segment.");
  }
  return rest.length === 0 ? { [head]: leaf } : { [head]: nestPath(rest, leaf) };
}
