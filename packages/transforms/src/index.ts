export * from "./imports";
export {
  applyUtilsImportRetarget,
  installerAliasRootsCompatible,
  resolveInstallerAliases,
  updateImportAliases,
  type InstallerAliases,
  type InstallerAliasInput,
} from "./shadcn-import-aliases";

export type {
  ConfigJson,
  Preset,
  Registry,
  RegistryBaseItem,
  RegistryFontItem,
  RegistryItem,
} from "shadcn-vue/schema";

export {
  configJsonSchema,
  configSchema,
  presetSchema,
  rawConfigSchema,
  registryIndexSchema,
  registryItemFileSchema,
  registryItemSchema,
  registryItemTypeSchema,
  registrySchema,
  workspaceConfigSchema,
} from "shadcn-vue/schema";

export {
  RegistryError,
  RegistryItemNotFoundError,
  RegistryNotFoundError,
  RegistryValidationError,
  resolveItemAddress,
  type ResolvedGitHubItemAddress,
  type ResolvedGitHubRegistrySource,
  type ResolvedItemAddress,
} from "shadcn-vue/registry";
