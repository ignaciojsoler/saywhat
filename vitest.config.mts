import { defineConfig } from "vitest/config"
import path from "node:path"

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      // "server-only" throws outside React Server Components; tests run server code directly
      "server-only": path.resolve(import.meta.dirname, "src/test/empty.ts"),
    },
  },
  test: { environment: "node" },
})
