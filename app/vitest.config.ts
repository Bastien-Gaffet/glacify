import { defineConfig } from "vitest/config";
import path from "path";

const root = path.resolve(import.meta.dirname);

export default defineConfig({
  root,
  resolve: {
    alias: {
      "@": path.resolve(root, "src"),
      "@contracts": path.resolve(root, "contracts"),
      "@db": path.resolve(root, "db"),
    },
  },
  test: {
    environment: "node",
    include: ["api/**/*.test.ts", "contracts/**/*.test.ts"],
  },
});
