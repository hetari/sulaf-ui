import { describe, expect, it } from "vitest";

import { DEFAULT_ALIASES } from "./imports";
import {
  SHADCN_DEFAULT_COMPONENTS,
  SHADCN_DEFAULT_UTILS,
  SHADCN_VERSION,
  configWithDefaults,
  createConfig,
  transformInstallerSource,
} from "./shadcn-cli-runtime";
import { resolveInstallerAliases, updateImportAliases } from "./shadcn-import-aliases";

const installerConfig = (aliases: Parameters<typeof resolveInstallerAliases>[0]) =>
  configWithDefaults(
    createConfig({
      style: "new-york",
      typescript: true,
      tailwind: {
        config: "",
        css: "assets/css/tailwind.css",
        baseColor: "zinc",
        cssVariables: true,
      },
      aliases: resolveInstallerAliases(aliases),
    }),
  );

const specifierViaBundler = async (
  moduleSpecifier: string,
  aliases: Parameters<typeof resolveInstallerAliases>[0],
): Promise<string> => {
  const quote = moduleSpecifier.includes("'") ? '"' : "'";
  const raw = `import x from ${quote}${moduleSpecifier}${quote};\n`;
  const out = await transformInstallerSource({
    filename: "parity-stub.ts",
    raw,
    config: installerConfig(aliases),
    isRemote: false,
  });
  const match = out.match(/from\s+(["'])(.+?)\1/s);
  return match?.[2] ?? moduleSpecifier;
};

describe("shadcn-vue installer parity", () => {
  it("pins shadcn-vue via registry chunk export map", () => {
    expect(SHADCN_VERSION).toBe("2.8.2");
    expect(SHADCN_DEFAULT_COMPONENTS).toBe("@/components");
    expect(SHADCN_DEFAULT_UTILS).toBe("@/lib/utils");
  });

  it("matches bundled transformImport for staged registry paths", async () => {
    expect(DEFAULT_ALIASES.components).toBe(SHADCN_DEFAULT_COMPONENTS);
    expect(DEFAULT_ALIASES.utils).toBe(SHADCN_DEFAULT_UTILS);

    const cases: { staged: string; aliases?: Parameters<typeof resolveInstallerAliases>[0] }[] = [
      { staged: "@/registry/sulaf/ui/bar" },
      { staged: "@/registry/sulaf/lib/foo" },
      { staged: "@/registry/sulaf/composables/use-x" },
      { staged: "@/registry/sulaf/components/card" },
      {
        staged: "@/registry/sulaf/lib/utils",
        aliases: {
          ...DEFAULT_ALIASES,
          lib: "@/helpers",
          utils: "@/helpers/classnames",
        },
      },
    ];

    for (const { staged, aliases = DEFAULT_ALIASES } of cases) {
      const cfg = { aliases };
      expect(updateImportAliases(staged, cfg)).toBe(await specifierViaBundler(staged, cfg.aliases));
    }
  });
});
