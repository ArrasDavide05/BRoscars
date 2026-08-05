import { defineConfig } from "vitest/config";
import path from "node:path";

// Node environment: the domain layer and the in-memory store are
// framework-agnostic and need no DOM. The alias resolves the "@/*" imports.
export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});
