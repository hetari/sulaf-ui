import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { glob } from "tinyglobby";

const root = resolve(import.meta.dirname, "..");
for (const file of await glob("src/**/*.{vue,ts}", {
  cwd: root,
  absolute: true,
})) {
  const code = readFileSync(file, "utf8");
  const out = code.replace(/(from\s*['"])@\//g, "$1@sulaf/ui/");
  if (out !== code) writeFileSync(file, out);
}
