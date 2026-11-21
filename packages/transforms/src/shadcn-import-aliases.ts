import { rawConfigSchema } from "shadcn-vue/schema";

export type InstallerAliases = Required<
  Pick<
    typeof rawConfigSchema._output.aliases,
    "components" | "utils" | "ui" | "lib" | "composables"
  > & { hooks: string }
>;

export type InstallerAliasInput = {
  components: string;
  utils: string;
  ui?: string;
  lib?: string;
  hooks?: string;
  composables?: string;
};

const aliasPathRoot = (alias: string): string => alias.split("/")[0]!;

/**
 * Fills optional alias keys the way `shadcn-vue` init writes `components.json`
 * (`components.replace(/\/components$/, "/lib"|"/composables")`) and the way
 * `updateImportAliases` defaults `ui`.
 */
export function resolveInstallerAliases(aliases: InstallerAliasInput): InstallerAliases {
  const composables =
    aliases.composables ??
    aliases.hooks ??
    aliases.components.replace(/\/components$/, "/composables");
  return {
    components: aliases.components,
    utils: aliases.utils,
    ui: aliases.ui ?? `${aliases.components}/ui`,
    lib: aliases.lib ?? aliases.components.replace(/\/components$/, "/lib"),
    hooks: composables,
    composables,
  };
}

/**
 * shadcn-vue@2.8.2 `updateImportAliases` (packages/cli/src/utils/transformers/transform-import.ts).
 * Not exported from `shadcn-vue` yet; kept in sync via shadcn-installer-parity.spec.ts.
 */
export function updateImportAliases(
  moduleSpecifier: string,
  config: { aliases: InstallerAliasInput | InstallerAliases },
  isRemote = false,
): string {
  const { aliases } = { aliases: resolveInstallerAliases(config.aliases) };

  if (!moduleSpecifier.startsWith("@/") && !isRemote) return moduleSpecifier;

  if (isRemote && moduleSpecifier.startsWith("@/")) {
    moduleSpecifier = moduleSpecifier.replace(/^@\//, `@/registry/new-york/`);
  }

  if (moduleSpecifier.match(/^@\/styles\//)) {
    moduleSpecifier = moduleSpecifier.replace(/^@\/styles\//, "@/registry/");
  }

  if (!moduleSpecifier.startsWith("@/registry/")) {
    const root = aliases.components.split("/")[0]!;
    return moduleSpecifier.replace(/^@\//, `${root}/`);
  }

  if (moduleSpecifier.match(/^@\/registry\/(.+)\/ui/)) {
    return moduleSpecifier.replace(
      /^@\/registry\/(.+)\/ui/,
      aliases.ui ?? `${aliases.components}/ui`,
    );
  }

  if (aliases.components && moduleSpecifier.match(/^@\/registry\/(.+)\/components/)) {
    return moduleSpecifier.replace(/^@\/registry\/(.+)\/components/, aliases.components);
  }

  if (aliases.lib && moduleSpecifier.match(/^@\/registry\/(.+)\/lib/)) {
    return moduleSpecifier.replace(/^@\/registry\/(.+)\/lib/, aliases.lib);
  }

  if (aliases.composables && moduleSpecifier.match(/^@\/registry\/(.+)\/composables/)) {
    return moduleSpecifier.replace(/^@\/registry\/(.+)\/composables/, aliases.composables);
  }

  return moduleSpecifier.replace(/^@\/registry\/[^/]+/, aliases.components);
}

const importStub = (moduleSpecifier: string, named?: "cn"): string => {
  const clause = named ? `{ ${named} }` : "x";
  if (!moduleSpecifier.includes("'")) {
    return `import ${clause} from '${moduleSpecifier}';\n`;
  }
  if (!moduleSpecifier.includes('"')) {
    return `import ${clause} from "${moduleSpecifier}";\n`;
  }
  throw new Error(`module specifier cannot be quoted for installer simulation: ${moduleSpecifier}`);
};

const specifierFromInstaller = async (
  raw: string,
  aliases: InstallerAliasInput | InstallerAliases,
): Promise<string> => {
  const { configWithDefaults, createConfig, transformInstallerSource } =
    await import("./shadcn-cli-runtime");
  const config = configWithDefaults(
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
  const code = await transformInstallerSource({
    filename: "sulaf-installer-stub.ts",
    raw,
    config,
    isRemote: false,
  });
  const match = code.match(/from\s+(["'])(.+?)\1/s) ?? code.match(/import\s*\(\s*(["'])(.+?)\1/s);
  return match?.[2] ?? "";
};

/** shadcn-vue `transformImport` utils branch; uses the published installer transform. */
export async function applyUtilsImportRetarget(
  sourcePath: string,
  config: { aliases: InstallerAliasInput | InstallerAliases },
  opts: { hasLocalCn?: boolean } = { hasLocalCn: true },
): Promise<string> {
  const raw = opts.hasLocalCn ? importStub(sourcePath, "cn") : importStub(sourcePath);
  const next = await specifierFromInstaller(raw, config.aliases);
  return next || sourcePath;
}

/**
 * Non-registry `@/…` paths (e.g. staged cn) use the components alias root. Retargeting
 * only runs when that root matches the utils alias root (shadcn-vue@2.8.2).
 */
export const installerAliasRootsCompatible = (
  aliases: InstallerAliasInput | InstallerAliases,
): boolean =>
  aliasPathRoot(resolveInstallerAliases(aliases).components) ===
  aliasPathRoot(resolveInstallerAliases(aliases).utils);
