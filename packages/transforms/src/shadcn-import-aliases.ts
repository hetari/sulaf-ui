import { DEFAULT_ALIASES } from "./imports";

export type InstallerAliases = typeof DEFAULT_ALIASES;

/** Pinned shadcn-vue@2.8.2 `updateImportAliases` from transform-import (registry build + install). */
export function updateImportAliases(
  moduleSpecifier: string,
  config: { aliases: InstallerAliases },
): string {
  if (!moduleSpecifier.startsWith("@/")) return moduleSpecifier;
  if (moduleSpecifier.match(/^@\/styles\//))
    moduleSpecifier = moduleSpecifier.replace(/^@\/styles\//, "@/registry/");
  if (!moduleSpecifier.startsWith("@/registry/")) {
    const alias = config.aliases.components.split("/")[0]!;
    return moduleSpecifier.replace(/^@\//, `${alias}/`);
  }
  if (moduleSpecifier.match(/^@\/registry\/(.+)\/ui/))
    return moduleSpecifier.replace(
      /^@\/registry\/(.+)\/ui/,
      config.aliases.ui ?? `${config.aliases.components}/ui`,
    );
  if (config.aliases.components && moduleSpecifier.match(/^@\/registry\/(.+)\/components/))
    return moduleSpecifier.replace(/^@\/registry\/(.+)\/components/, config.aliases.components);
  if (config.aliases.lib && moduleSpecifier.match(/^@\/registry\/(.+)\/lib/))
    return moduleSpecifier.replace(/^@\/registry\/(.+)\/lib/, config.aliases.lib);
  if (config.aliases.composables && moduleSpecifier.match(/^@\/registry\/(.+)\/composables/))
    return moduleSpecifier.replace(/^@\/registry\/(.+)\/composables/, config.aliases.composables);
  return moduleSpecifier.replace(/^@\/registry\/[^/]+/, config.aliases.components);
}

/** shadcn-vue@2.8.2 utils branch in `transformImport` after `updateImportAliases`. */
export function applyUtilsImportRetarget(
  sourcePath: string,
  config: { aliases: InstallerAliases },
  opts: { hasLocalCn?: boolean } = { hasLocalCn: true },
): string {
  const utilsAlias = config.aliases.utils;
  const utilsRoot =
    typeof utilsAlias === "string" && utilsAlias.includes("/") ? utilsAlias.split("/")[0]! : "@";
  const utilsImport = `${utilsRoot}/lib/utils`;
  const updated = updateImportAliases(sourcePath, config);
  if (!opts.hasLocalCn) return updated;
  if (utilsImport === updated || updated === "@/lib/utils") {
    return utilsImport === updated ? updated.replace(utilsImport, utilsAlias) : utilsAlias;
  }
  return updated;
}
