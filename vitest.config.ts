import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const root = fileURLToPath(new URL(".", import.meta.url));
const packages = [
  ["@thaarei/core", "core"],
  ["@thaarei/contracts", "contracts"],
  ["@thaarei/adapters", "adapters"],
  ["@thaarei/test-support", "test-support"],
  ["@thaarei/database", "database"],
  ["@thaarei/api", "api"],
  ["@thaarei/api-client", "api-client"],
  ["@thaarei/design-tokens", "design-tokens"],
] as const;

export default defineConfig({
  resolve: {
    alias: Object.fromEntries(
      packages.map(([name, directory]) => [
        name,
        resolve(root, "packages", directory, "src", "index.ts"),
      ]),
    ),
  },
  test: {
    include: ["packages/**/tests/**/*.test.ts", "apps/**/tests/**/*.test.ts"],
    testTimeout: 30_000,
    coverage: {
      enabled: false,
      provider: "v8",
      reporter: ["text", "json-summary"],
      reportsDirectory: ".artifacts/coverage",
      include: ["packages/**/src/**/*.ts", "apps/**/src/**/*.ts"],
      exclude: ["packages/api-client/src/generated/**", "packages/database/migrations/**"],
      thresholds: { lines: 70, functions: 70, branches: 60 },
    },
  },
});
