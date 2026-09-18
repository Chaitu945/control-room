import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["test/**/*.test.ts"],
  },
  resolve: {
    // Mirrors the "@/*" -> "./src/*" mapping in tsconfig.json. Resolved from the
    // working directory, which npm scripts always set to the project root.
    alias: { "@": path.resolve(process.cwd(), "src") },
  },
});
