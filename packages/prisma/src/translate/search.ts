import type { SearchNode } from "@razsdev/datasieve-query-language";
import { nestPath } from "./path.js";
import type { TranslateOptions } from "./options.js";

/**
 * Translates a DSQL {@link SearchNode} into a Prisma `where` fragment: an
 * `OR` of the search term matched against every requested field. Returns
 * `undefined` for a `null` search, mirroring `translateFilter`.
 *
 * This produces a standalone `where` fragment, not the full query's
 * `where` — see `adapter.ts` for how it's combined (`AND`-ed) with the
 * filter-derived `where`, since `search` and `where` are independent
 * DSQL concepts that both narrow the same result set.
 *
 * `search.caseSensitive` and `options.caseInsensitiveMode` are separate
 * knobs: the former is DSQL's own per-query request; the latter (see
 * `translate/options.ts`) is whether this *provider* even supports
 * Prisma's `mode: "insensitive"`. Case-insensitive search is only
 * emitted with an explicit `mode` when both agree.
 *
 * @example
 * ```ts
 * translateSearch(
 *   { value: "ada", mode: "contains", fields: ["name", "email"], caseSensitive: false },
 *   { caseInsensitiveMode: true },
 * );
 * // -> { OR: [
 * //   { name: { contains: "ada", mode: "insensitive" } },
 * //   { email: { contains: "ada", mode: "insensitive" } },
 * // ] }
 * ```
 */
export function translateSearch(search: SearchNode | null, options: TranslateOptions): Record<string, unknown> | undefined {
  if (!search) return undefined;

  const stringFilter: Record<string, unknown> =
    search.mode === "exact" ? { equals: search.value } : { [search.mode]: search.value };
  if (!search.caseSensitive && options.caseInsensitiveMode) {
    stringFilter.mode = "insensitive";
  }

  return { OR: search.fields.map((field) => nestPath(field.split("."), stringFilter)) };
}
