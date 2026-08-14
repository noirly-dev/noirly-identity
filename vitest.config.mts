/** @type {import('vitest/config').UserConfig} */
import { defineConfig } from "vitest/config";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    environment: "node",
    globals: false,
    setupFiles: ["./tests/setup.ts"],
    fileParallelism: false,
    hookTimeout: 120000,
    testTimeout: 60000,
  },
  resolve: {
    alias: {
      "@": root,
    },
  },
});
