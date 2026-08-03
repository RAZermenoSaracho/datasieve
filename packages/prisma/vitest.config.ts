import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    globalSetup: ["./tests/global-setup.ts"],
    // All test files share one seeded SQLite file; running them in a
    // single process avoids any cross-worker SQLite file-locking surprises.
    fileParallelism: false,
    testTimeout: 20000,
  },
});
