// This project uses oxlint and oxfmt instead of ESLint.
// This empty configuration prevents ESLint from traversing up to parent directories (e.g. ~/eslint.config.mjs).
export default [
  {
    ignores: ["**/*"],
  },
];
