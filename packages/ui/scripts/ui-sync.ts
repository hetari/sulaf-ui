import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { execa } from "execa";

const root = resolve(import.meta.dirname, "..");
const names = readFileSync(resolve(root, "UPSTREAM.txt"), "utf8").split("\n").filter(Boolean);
if (!names.length) process.exit(0);
await execa("shadcn-vue", ["add", ...names, "--yes", "--overwrite"], {
  cwd: root,
  preferLocal: true,
  stdio: "inherit",
});
