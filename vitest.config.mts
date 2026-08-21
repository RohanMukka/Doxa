import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    // Mirrors the `@/*` alias in tsconfig so tests import the same way the app does.
    alias: { "@": path.resolve(path.dirname(fileURLToPath(import.meta.url)), "./src") },
  },
  test: {
    include: ["src/**/*.test.ts"],
  },
});
