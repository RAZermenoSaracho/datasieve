import { describe, expect, test } from "vitest";
import { runHooks, type PipelineHook } from "../src/pipeline/middleware.js";
import type { DataSievePluginContext } from "../src/plugin/plugin.js";

const ctx: DataSievePluginContext = { resource: null, state: {} };

describe("runHooks", () => {
  test("returns the initial value when there are no hooks", async () => {
    const result = await runHooks([], 1, ctx);
    expect(result).toBe(1);
  });

  test("skips undefined hooks", async () => {
    const hooks: Array<PipelineHook<number> | undefined> = [undefined, (value) => value + 1, undefined];
    const result = await runHooks(hooks, 1, ctx);
    expect(result).toBe(2);
  });

  test("threads each hook's return value into the next hook", async () => {
    const hooks: PipelineHook<number>[] = [(value) => value + 1, (value) => value * 2, (value) => value - 3];
    const result = await runHooks(hooks, 1, ctx);
    // (1 + 1) * 2 - 3 = 1
    expect(result).toBe(1);
  });

  test("a hook returning void leaves the value unchanged for the next hook", async () => {
    const seen: number[] = [];
    const hooks: PipelineHook<number>[] = [
      (value) => {
        seen.push(value);
        return undefined;
      },
      (value) => {
        seen.push(value);
        return value + 10;
      },
    ];
    const result = await runHooks(hooks, 5, ctx);
    expect(seen).toEqual([5, 5]);
    expect(result).toBe(15);
  });

  test("awaits async hooks in order", async () => {
    const order: string[] = [];
    const hooks: PipelineHook<number>[] = [
      async (value) => {
        await Promise.resolve();
        await Promise.resolve();
        order.push("first");
        return value + 1;
      },
      async (value) => {
        order.push("second");
        return value + 1;
      },
    ];
    const result = await runHooks(hooks, 0, ctx);
    expect(order).toEqual(["first", "second"]);
    expect(result).toBe(2);
  });

  test("passes the shared context through to every hook", async () => {
    const seenContexts: DataSievePluginContext[] = [];
    const hooks: PipelineHook<number>[] = [
      (value, hookCtx) => {
        seenContexts.push(hookCtx);
        return value;
      },
    ];
    await runHooks(hooks, 1, ctx);
    expect(seenContexts).toEqual([ctx]);
  });
});
