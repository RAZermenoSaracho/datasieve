/**
 * Minimal structural shape this adapter needs from a Prisma model
 * delegate (e.g. `prisma.user`). Deliberately loose (`Record<string,
 * unknown>` arguments/results rather than Prisma's exact, per-model
 * generated types): the arguments this adapter builds are assembled
 * dynamically from a {@link QueryAST}, so they can never be checked
 * against a specific model's exact generated argument type at compile
 * time anyway — the same reason `@datasieve/query-language`'s
 * `normalizeQuery` and `@datasieve/core`'s `buildResponse` each have
 * exactly one generic-erasure boundary. This is this adapter's.
 *
 * `resource` arrives at {@link prismaAdapter}'s `execute` typed as
 * `unknown` (Core's `DataSieveAdapter<TResource>` defaults `TResource`
 * to `unknown`), and is cast to this interface once, at that boundary —
 * see `adapter.ts`. Prisma's real delegate types are exercised for real
 * at the *call site* (`engine.query({ resource: prisma.user, ... })`),
 * since any concrete type is assignable to `unknown`.
 */
export interface PrismaModelDelegate {
  findMany(args: Record<string, unknown>): Promise<unknown[]>;
  count(args: Record<string, unknown>): Promise<number>;
  groupBy(args: Record<string, unknown>): Promise<unknown[]>;
}

/**
 * Minimal structural shape this adapter needs from a `PrismaClient`
 * instance: just `$transaction`, used to run a page fetch and its count
 * together consistently. See {@link prismaAdapter}.
 */
export interface PrismaClientLike {
  $transaction<T extends readonly unknown[]>(operations: readonly [...{ [K in keyof T]: Promise<T[K]> }]): Promise<T>;
}
