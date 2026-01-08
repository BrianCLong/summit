import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "happy-dom",
    globals: true,
    setupFiles: "./vitest.setup.ts",
    resolveSnapshotPath: (testPath, snapExtension) =>
      testPath.replace(/\.([tj]sx?)/, `.snap${snapExtension}`),
  },
});
