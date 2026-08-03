/**
 * Options threaded through every `translate/*` function that can produce
 * a provider-specific filter shape. Currently just one: whether to emit
 * Prisma's `mode: "insensitive"` filter option.
 *
 * `mode: "insensitive"` is Postgres/MySQL-only — SQLite's query engine
 * rejects it outright ("Unknown argument `mode`"), which is why this
 * defaults to `false` (safe on every provider) rather than being applied
 * unconditionally. SQLite's own `LIKE` is already ASCII-case-insensitive
 * by default, which is why `ilike`/case-insensitive `search` still work
 * as expected on SQLite without it. Postgres/MySQL users who want real
 * (Unicode-aware) case-insensitive matching should opt in via
 * `prismaAdapter(prisma, { caseInsensitiveMode: true })`.
 */
export interface TranslateOptions {
  caseInsensitiveMode: boolean;
}
