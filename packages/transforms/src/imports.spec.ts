import { describe, expect, it } from "vitest";

import { rewriteImports } from "./imports";

const file = "src/ui/foo/Foo.vue";

describe("rewriteImports", () => {
  it("maps a primitive and records it", () => {
    const r = rewriteImports(`import { Button } from '@sulaf/ui/components/ui/button'`, { file });
    expect(r.code).toBe(`import { Button } from '@/components/ui/button'`);
    expect(r.primitives).toEqual(["button"]);
  });
  it("maps cn()", () => {
    expect(rewriteImports(`import { cn } from "@sulaf/ui/lib/utils"`, { file }).code).toBe(
      `import { cn } from "@/lib/utils"`,
    );
  });
  it("records a sibling item and rewrites to the user alias", () => {
    const r = rewriteImports(`import { Bar } from '../bar'`, { file });
    expect(r.code).toBe(`import { Bar } from '@/components/ui/bar'`);
    expect(r.siblings).toEqual([{ kind: "ui", name: "bar" }]);
  });
  it("keeps imports inside the same item and collects bare packages (never vue)", () => {
    const r = rewriteImports(
      `import { ref } from 'vue'\nimport { X } from 'reka-ui'\nimport L from './Local.vue'`,
      { file },
    );
    expect(r.packages).toEqual(["reka-ui"]);
    expect(r.code).toContain(`'./Local.vue'`);
  });
  it.each([
    [`import x from '@/components/ui/button'`],
    [`import x from '@sulaf/ui/components/ui/button/Button.vue'`],
    [`import x from '../../../docs/secret'`],
    [`import x from '@sulaf/registry/ui/foo'`],
  ])("throws on %s", (line) => {
    expect(() => rewriteImports(line, { file })).toThrow(file);
  });
  it("in demo mode maps registry aliases to what a user would write", () => {
    const r = rewriteImports(`import { Foo } from '@sulaf/registry/ui/foo'`, {
      file: "src/examples/foo-demo.vue",
      mode: "demo",
    });
    expect(r.code).toBe(`import { Foo } from '@/components/ui/foo'`);
  });
});
