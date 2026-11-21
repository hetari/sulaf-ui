import { describe, expect, it } from "vitest";

import {
  DEFAULT_ALIASES,
  STAGED_UTILS_CANONICAL_SPEC,
  STAGED_UTILS_REGISTRY_SPEC,
  STAGED_UTILS_SPEC,
  rewriteImports,
} from "./imports";
import {
  applyUtilsImportRetarget,
  installerAliasRootsCompatible,
  resolveInstallerAliases,
  updateImportAliases,
} from "./shadcn-import-aliases";

const file = "src/ui/foo/Foo.vue";

const utilsSpecifierFromRewrite = (): string =>
  rewriteImports(`import { cn } from "@sulaf/ui/lib/utils"`, { file }).code.match(
    /from "([^"]+)"/,
  )![1]!;

describe("rewriteImports", () => {
  it("maps a primitive and records it", () => {
    const r = rewriteImports(`import { Button } from '@sulaf/ui/components/ui/button'`, { file });
    expect(r.code).toBe(`import { Button } from '@/registry/sulaf/ui/button'`);
    expect(r.primitives).toEqual(["button"]);
  });
  it("maps cn() for installer utils retarget", () => {
    expect(rewriteImports(`import { cn } from "@sulaf/ui/lib/utils"`, { file }).code).toBe(
      `import { cn } from "@/registry/sulaf/lib/utils"`,
    );
    expect(utilsSpecifierFromRewrite()).toBe(STAGED_UTILS_SPEC);
    expect(STAGED_UTILS_REGISTRY_SPEC).toBe("@/registry/sulaf/lib/utils");
  });
  it("stages utils for shadcn-vue aliases.utils retarget via local cn", async () => {
    expect(
      await applyUtilsImportRetarget(utilsSpecifierFromRewrite(), {
        aliases: { ...DEFAULT_ALIASES, utils: "@/helpers/classnames" },
      }),
    ).toBe("@/helpers/classnames");
  });
  it("retargets utils when aliases.lib is noncanonical with aliases.utils nested beneath it", async () => {
    expect(
      await applyUtilsImportRetarget(STAGED_UTILS_CANONICAL_SPEC, {
        aliases: {
          ...DEFAULT_ALIASES,
          lib: "@/helpers",
          utils: "@/helpers/classnames",
        },
      }),
    ).toBe("@/helpers/classnames");
  });
  it("retains coverage for default aliases retargeting", async () => {
    expect(
      await applyUtilsImportRetarget(utilsSpecifierFromRewrite(), {
        aliases: DEFAULT_ALIASES,
      }),
    ).toBe(DEFAULT_ALIASES.utils);
  });
  it("retargets utils when aliases.lib is customized to match a non-default root", async () => {
    expect(
      await applyUtilsImportRetarget(utilsSpecifierFromRewrite(), {
        aliases: {
          ...DEFAULT_ALIASES,
          components: "~/components",
          ui: "~/components/ui",
          lib: "~/lib",
          utils: "~/helpers/classnames",
        },
      }),
    ).toBe("~/helpers/classnames");
  });
  it("retargets utils when components and utils alias roots differ (registry lib staging)", async () => {
    expect(
      installerAliasRootsCompatible({
        components: "~/components",
        utils: "@/helpers/classnames",
      }),
    ).toBe(false);
    expect(
      await applyUtilsImportRetarget(utilsSpecifierFromRewrite(), {
        aliases: {
          ...DEFAULT_ALIASES,
          components: "~/components",
          ui: "~/components/ui",
          utils: "@/helpers/classnames",
        },
      }),
    ).toBe("@/helpers/classnames");
  });
  it("maps registry lib utils to aliases.lib when lib is customized (no utils retarget)", async () => {
    expect(
      await applyUtilsImportRetarget(STAGED_UTILS_REGISTRY_SPEC, {
        aliases: {
          ...DEFAULT_ALIASES,
          lib: "@/helpers",
          utils: "@/helpers/classnames",
        },
      }),
    ).toBe("@/helpers/utils");
  });
  it.each([
    [`import { cn as cx } from "@sulaf/ui/lib/utils"`],
    [`import * as utils from "@sulaf/ui/lib/utils"`],
    [`import utils from "@sulaf/ui/lib/utils"`],
    [`import type { cn } from "@sulaf/ui/lib/utils"`],
    [`import { type cn } from "@sulaf/ui/lib/utils"`],
    [`import { Cn } from "@sulaf/ui/lib/utils"`],
    [`const utils = await import("@sulaf/ui/lib/utils")`],
    [`const { cn: cx } = await import("@sulaf/ui/lib/utils")`],
  ])("rejects utils import forms the installer cannot retarget: %s", (line) => {
    expect(() => rewriteImports(line, { file })).toThrow("cn");
  });
  it("records a sibling item and rewrites to the user alias", () => {
    const r = rewriteImports(`import { Bar } from '../bar'`, { file });
    expect(r.code).toBe(`import { Bar } from '@/registry/sulaf/ui/bar'`);
    expect(r.siblings).toEqual([{ kind: "ui", name: "bar" }]);
  });
  it("staged ui sibling paths remap to aliases.ui on install", () => {
    const staged = "@/registry/sulaf/ui/bar";
    expect(updateImportAliases(staged, { aliases: DEFAULT_ALIASES })).toBe(
      `${DEFAULT_ALIASES.ui}/bar`,
    );
  });
  it("infers lib and composables aliases when omitted", () => {
    const partial = { components: "@/components", utils: "@/lib/utils" };
    expect(resolveInstallerAliases(partial).lib).toBe("@/lib");
    expect(resolveInstallerAliases(partial).composables).toBe("@/composables");
    expect(resolveInstallerAliases({ components: "@/ui", utils: "@/lib/utils" }).lib).toBe("@/ui");
    expect(
      updateImportAliases("@/registry/sulaf/lib/foo", {
        aliases: partial,
      }),
    ).toBe("@/lib/foo");
    expect(
      updateImportAliases("@/registry/sulaf/composables/use-x", {
        aliases: partial,
      }),
    ).toBe("@/composables/use-x");
  });
  it("rejects cross-item imports to files whose path starts with a kind token", () => {
    expect(() => rewriteImports(`import Helper from '../bar/ui-helper'`, { file })).toThrow(
      "installer-unsafe",
    );
  });
  it("rejects cross-item imports into nested kind-named directories", () => {
    expect(() => rewriteImports(`import Child from '../bar/ui/Child.vue'`, { file })).toThrow(
      "nested kind-named directories",
    );
  });
  it("keeps imports inside the same item and collects bare packages (never vue)", () => {
    const r = rewriteImports(
      `import { ref } from 'vue'\nimport { X } from 'reka-ui'\nimport L from './Local.vue'`,
      { file },
    );
    expect(r.packages).toEqual(["reka-ui"]);
    expect(r.code).toContain(`'./Local.vue'`);
  });
  it("does not collect node built-ins in packages", () => {
    const r = rewriteImports(
      `import { join } from 'node:path'\nimport fs from 'fs'\nimport { X } from 'reka-ui'`,
      { file: "src/lib/foo/index.ts" },
    );
    expect(r.packages).toEqual(["reka-ui"]);
  });
  it("supports dynamic imports with one or two arguments", () => {
    const r = rewriteImports(
      `const a = import('@sulaf/ui/components/ui/button')\nconst b = import('@sulaf/ui/components/ui/badge', { with: { type: 'json' } })`,
      { file },
    );
    expect(r.code).toContain(`import('@/registry/sulaf/ui/button')`);
    expect(r.code).toContain(`import('@/registry/sulaf/ui/badge', { with: { type: 'json' } })`);
    expect(r.primitives).toEqual(["badge", "button"]);
  });
  it("rejects TypeScript import() types that the installer cannot rewrite", () => {
    expect(() =>
      rewriteImports(`type ButtonProps = import('@sulaf/ui/components/ui/button').ButtonProps`, {
        file,
      }),
    ).toThrow("import() type");
  });
  it("processes complete Vue SFCs and preserves template", () => {
    const sfc = `<script setup lang="ts">
import { Button } from "@sulaf/ui/components/ui/button";
</script>

<template>
  <Button>Hello World From Sulaf</Button>
</template>`;
    const r = rewriteImports(sfc, { file: "src/ui/hello-world/HelloWorld.vue" });
    expect(r.code).toBe(`<script setup lang="ts">
import { Button } from "@/registry/sulaf/ui/button";
</script>

<template>
  <Button>Hello World From Sulaf</Button>
</template>`);
    expect(r.primitives).toEqual(["button"]);
  });
  it("processes both script and script setup blocks in any order and ignores comments", () => {
    const sfc = `<!--
<script setup>
import { Bad } from "@/components/bad";
</script>
-->
<script lang="ts">
import { Bar } from "../bar";
</script>
<script setup lang="ts">
import { Button } from "@sulaf/ui/components/ui/button";
</script>
<template><Button /></template>`;
    const r = rewriteImports(sfc, { file });
    expect(r.code).toContain(`import { Bar } from "@/registry/sulaf/ui/bar";`);
    expect(r.code).toContain(`import { Button } from "@/registry/sulaf/ui/button";`);
    expect(r.code).toContain(`import { Bad } from "@/components/bad";`);
    expect(r.primitives).toEqual(["button"]);
    expect(r.siblings).toEqual([{ kind: "ui", name: "bar" }]);
  });
  it.each([
    [`import x from '@/components/ui/button'`],
    [`import x from '@sulaf/ui/components/ui/button/Button.vue'`],
    [`import x from '../../../docs/secret'`],
    [`import x from '@sulaf/registry/ui/foo'`],
    [`import x from '#imports'`],
  ])("throws on %s", (line) => {
    expect(() => rewriteImports(line, { file })).toThrow(file);
  });
  it("does not parse template-only SFCs as bare scripts", () => {
    const sfc = `<template>
  <p>Run import("@sulaf/ui/components/ui/button") to install</p>
</template>`;
    const r = rewriteImports(sfc, { file: "src/ui/hello-world/HelloWorld.vue" });
    expect(r.code).toBe(sfc);
    expect(r.primitives).toEqual([]);
    expect(r.siblings).toEqual([]);
    expect(r.packages).toEqual([]);
  });
  it("collects npm packages named like node builtins when subpath imports them", () => {
    const r = rewriteImports(`import { Buffer } from 'buffer/index.js'`, {
      file: "src/lib/foo/index.ts",
    });
    expect(r.packages).toEqual(["buffer"]);
  });
  it("escapes apostrophes in rewritten module specifiers", () => {
    const r = rewriteImports(`import Other from '../other/it\\'s.vue'`, { file });
    expect(r.code).toBe(`import Other from '@/registry/sulaf/ui/other/it\\'s.vue'`);
  });
  it("does not misparse JSX in tsx vue script blocks", () => {
    const sfc = `<script setup lang="tsx">
export default () => <div>import("@sulaf/ui/components/ui/button")</div>;
</script>`;
    const r = rewriteImports(sfc, { file });
    expect(r.code).toBe(sfc);
    expect(r.primitives).toEqual([]);
  });
  it("rejects external script references in vue files", () => {
    const sfc = `<script src="../shared/component.ts"></script>\n<template><p /></template>`;
    expect(() => rewriteImports(sfc, { file: "src/ui/card/Card.vue" })).toThrow("external script");
  });
  it("rejects re-exports the installer cannot rewrite", () => {
    expect(() =>
      rewriteImports(`export { Button } from '@sulaf/ui/components/ui/button'`, { file }),
    ).toThrow("re-export");
  });
  it("in demo mode maps registry aliases and records sibling items", () => {
    const r = rewriteImports(`import { Foo } from '@sulaf/registry/ui/foo'`, {
      file: "src/examples/foo-demo.vue",
      mode: "demo",
    });
    expect(r.code).toBe(`import { Foo } from '@/registry/sulaf/ui/foo'`);
    expect(r.siblings).toEqual([{ kind: "ui", name: "foo" }]);
  });
});
