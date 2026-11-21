import { execSync } from "node:child_process";
import { resolve } from "node:path";

const fixture = resolve(import.meta.dirname, "fixtures/nuxt");
execSync("pnpm install && pnpm run build", { cwd: fixture, stdio: "inherit" });
