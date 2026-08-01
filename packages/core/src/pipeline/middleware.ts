import type { Awaitable, DataSievePluginContext } from "../plugin/plugin.js";

/**
 * The shape every plugin mutation hook shares: given the current value
 * and the shared per-query context, optionally return a replacement.
 * `beforeNormalize`, `beforeExecute`, `afterExecute`, and `afterTransform`
 * on {@link DataSievePlugin} are all instances of this shape.
 */
export type PipelineHook<V> = (value: V, ctx: DataSievePluginContext) => Awaitable<V | void>;

/**
 * Runs a sequence of optional {@link PipelineHook}s over `initialValue`,
 * in order, awaiting each one. A hook that returns a value (rather than
 * `void`) replaces the value passed to the next hook — the same
 * threading pattern classic middleware pipelines use, specialized here
 * to "transform a value" rather than "call next()".
 *
 * This is the one piece of composition logic every plugin lifecycle
 * stage in `pipeline/execute.ts` is built from; it has no DataSieve-
 * specific knowledge of its own; `undefined`/missing hooks are simply
 * skipped, so plugins that don't implement a given stage add no overhead.
 *
 * @example
 * ```ts
 * const query = await runHooks(
 *   plugins.map((p) => p.beforeNormalize),
 *   initialQuery,
 *   ctx,
 * );
 * ```
 */
export async function runHooks<V>(
  hooks: ReadonlyArray<PipelineHook<V> | undefined>,
  initialValue: V,
  ctx: DataSievePluginContext,
): Promise<V> {
  let value = initialValue;
  for (const hook of hooks) {
    if (!hook) continue;
    const result = await hook(value, ctx);
    if (result !== undefined) {
      value = result;
    }
  }
  return value;
}
