import { defineConfig } from "oxlint";

export default defineConfig({
  plugins: ["import", "jsdoc", "eslint"],
  categories: {
    correctness: "error",
    suspicious: "warn",
    perf: "warn",
  },
  rules: {
    // --- Core ESLint rules antfu enables by default ---
    "no-console": ["warn", { allow: ["warn", "error"] }],
    "no-debugger": "error",
    "no-unused-vars": "off", // handled by typescript/no-unused-vars
    "no-var": "error",
    "prefer-const": "error",
    eqeqeq: ["error", "always", { null: "ignore" }],
    "object-shorthand": ["error", "always"],
    "no-implicit-coercion": "warn",
    "no-throw-literal": "error",
    "no-underscore-dangle": ["warn", { allow: ["_data"] }],
    "typescript/require-await": "error",

    // --- TypeScript ---
    "typescript/no-unused-vars": [
      "error",
      {
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_",
        caughtErrorsIgnorePattern: "^_",
      },
    ],
    "typescript/no-explicit-any": "warn",
    "typescript/consistent-type-imports": [
      "error",
      {
        prefer: "type-imports",
        fixStyle: "inline-type-imports",
      },
    ],
    "typescript/no-import-type-side-effects": "error",
    "typescript/return-await": ["error", "in-try-catch"],

    // --- Unicorn (subset antfu relies on) ---
    "unicorn/prefer-node-protocol": "error",
    "unicorn/prefer-number-properties": "error",
    "unicorn/prefer-string-slice": "error",
    "unicorn/prefer-includes": "error",
    "unicorn/throw-new-error": "error",

    // --- Import hygiene ---
    "import/no-duplicates": "error",
    "import/first": "error",
    "import/newline-after-import": "error",
    "import/no-mutable-exports": "error",

    // https://oxc.rs/docs/guide/usage/linter/rules.html?sort=name&dir=asc
    "sort-imports": [
      "error",
      {
        ignoreDeclarationSort: true,
      },
    ],
    "no-restricted-imports": [
      "error",
      {
        patterns: [
          {
            group: ["~/components/ui/*", "@/components/ui/*"],
            message: "Import primitives from @sulaf/ui/components/ui/*",
          },
          {
            group: ["@/*"],
            message: "In apps/docs use ~/. The @ alias is not used.",
          },
        ],
      },
    ],
  },

  settings: {},
  options: {
    typeAware: true, // pnpm add -Dw oxlint-tsgolint@latest
    typeCheck: true, // experimental
  },
  env: {
    es2024: true,
    browser: true,
    node: true,
  },
  ignorePatterns: [
    "**/dist",
    "**/.nuxt",
    "**/.output",
    "packages/ui/src/components/ui/**",
    "packages/ui/src/styles/**",
    "e2e/fixtures/**",
  ],
});
