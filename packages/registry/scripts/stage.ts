import { mkdir, readFile, rm, writeFile } from "node:fs/promises";

import { rewriteImports } from "@sulaf/transforms";
import { execa } from "execa";
import { dirname, resolve } from "pathe";

const root = resolve(import.meta.dirname, "..");
const stage = resolve(root, "dist/.stage");

const manual = JSON.parse(await readFile(resolve(root, "registry.manual.json"), "utf8"));

await rm(resolve(root, "dist"), { recursive: true, force: true });
await mkdir(stage, { recursive: true });

await Promise.all(
  manual.items.flatMap((item: { name: string; files: { path: string }[] }) =>
    item.files.map(async (file: { path: string }) => {
      const source = await readFile(resolve(root, file.path), "utf8");
      const { code, primitives } = rewriteImports(source, { file: file.path });
      // eslint-disable-next-line no-console
      console.log(
        `${item.name}: ${file.path}${primitives.length ? `  (primitives: ${primitives.join(", ")})` : ""}`,
      );
      const dest = resolve(stage, file.path);
      await mkdir(dirname(dest), { recursive: true });
      await writeFile(dest, code);
    }),
  ),
);

await writeFile(resolve(stage, "registry.json"), JSON.stringify(manual, null, 2));
await execa("shadcn-vue", ["build", "registry.json", "--output", "../r"], {
  cwd: stage,
  preferLocal: true,
  stdio: "inherit",
});
