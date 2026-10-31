import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { execa } from "execa";

const root = resolve(import.meta.dirname, "..");
const listFile = resolve(root, "UPSTREAM.txt");
const names = process.argv.slice(2);
if (!names.length) {
  console.error("usage: pnpm ui:add <component> [more...]");
  process.exit(1);
}

const nodeOptions = [
  process.env.NODE_OPTIONS,
  "--network-family-autoselection-attempt-timeout=5000",
]
  .filter(Boolean)
  .join(" ");

await execa("shadcn-vue", ["add", ...names, "--yes", "--overwrite"], {
  cwd: root,
  preferLocal: true,
  stdio: "inherit",
  env: {
    ...process.env,
    NODE_OPTIONS: nodeOptions,
  },
});

const current = existsSync(listFile)
  ? readFileSync(listFile, "utf8").split("\n").filter(Boolean)
  : [];
writeFileSync(listFile, `${[...new Set([...current, ...names])].sort().join("\n")}\n`);

console.warn(
  '\nNow: replace any new dependency range with "catalog:" (or add it to the catalog), then pnpm install.',
);
