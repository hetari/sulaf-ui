import { dirname, join } from "pathe";
import { RegistryValidationError } from "shadcn-vue/registry";
import { type RegistryItem, rawConfigSchema } from "shadcn-vue/schema";

export type RegistryItemType = RegistryItem["type"];
export type ItemKind = "ui" | "blocks" | "hooks" | "lib";

/** Maps Sulaf item kinds to canonical shadcn-vue registry item types. */
export const ITEM_KIND_TO_REGISTRY_TYPE: Record<ItemKind, RegistryItemType> = {
  ui: "registry:ui",
  blocks: "registry:block",
  hooks: "registry:hook",
  lib: "registry:lib",
};

/** Canonical default aliases matching shadcn-vue components.json. */
export const DEFAULT_ALIASES: Required<typeof rawConfigSchema._output.aliases> = {
  components: "@/components",
  ui: "@/components/ui",
  utils: "@/lib/utils",
  lib: "@/lib",
  hooks: "@/composables",
  composables: "@/composables",
};

/** Where each kind lands in a user's project, spelled with the canonical shadcn-vue aliases. */
export const KIND_ALIAS: Record<ItemKind, string> = {
  ui: DEFAULT_ALIASES.ui,
  blocks: DEFAULT_ALIASES.components,
  hooks: DEFAULT_ALIASES.composables,
  lib: DEFAULT_ALIASES.lib,
};

export interface RewriteResult {
  code: string;
  /** upstream primitives used, e.g. ["badge", "button"] -> become registryDependencies */
  primitives: NonNullable<RegistryItem["registryDependencies"]>;
  /** other Sulaf items imported -> become registryDependencies (URLs) */
  siblings: { kind: ItemKind; name: string }[];
  /** bare npm packages imported (never includes `vue`) -> become dependencies */
  packages: NonNullable<RegistryItem["dependencies"]>;
}

// Matches:  from 'x'   import('x')   import 'x'
const SPECIFIER = /(\bfrom\s*|\bimport\s*\(\s*|\bimport\s+)(['"])([^'"\n]+)\2/g;
// repo-relative path of a file inside an item folder: src/<kind>/<name>/...
const ITEM_PATH = /^src\/(ui|blocks|hooks|lib)\/([^/]+)(?:\/|$)/;
const PRIMITIVE_PREFIX = "@sulaf/ui/components/ui/";
const REGISTRY_PREFIX = /^@sulaf\/registry\/(ui|blocks|hooks|lib)\/([^/]+)$/;

const packageName = (s: string) =>
  s.startsWith("@") ? s.split("/", 2).join("/") : s.split("/")[0]!;

export function rewriteImports(
  code: string,
  // `file` is repo-relative to packages/registry, e.g. src/ui/foo/Foo.vue
  opts: { file: string; mode?: "item" | "demo" },
): RewriteResult {
  const { file, mode = "item" } = opts;
  const own = file.match(ITEM_PATH);
  const primitives = new Set<string>();
  const siblings = new Map<string, { kind: ItemKind; name: string }>();
  const packages = new Set<string>();

  const fail = (spec: string, why: string): never => {
    throw new RegistryValidationError(`${file}: import "${spec}" ${why}`);
  };

  const map = (spec: string): string => {
    // 1. primitives from the shared library
    if (spec.startsWith(PRIMITIVE_PREFIX)) {
      const rest = spec.slice(PRIMITIVE_PREFIX.length);
      if (rest.includes("/"))
        return fail(
          spec,
          `is a deep import; import the primitive folder, e.g. ${PRIMITIVE_PREFIX}button`,
        );
      primitives.add(rest);
      return `${DEFAULT_ALIASES.ui}/${rest}`;
    }
    if (spec === "@sulaf/ui/lib/utils") return DEFAULT_ALIASES.utils;
    if (spec.startsWith("@sulaf/ui/dev/")) return spec; // removed later by the icon transform (Phase 8)
    if (spec.startsWith("@sulaf/ui/"))
      return fail(spec, "is outside the import contract (see §4.3)");

    // 2. demos may import registry items by package alias; items may not
    if (spec.startsWith("@sulaf/registry/")) {
      if (mode === "item")
        return fail(spec, "is only allowed in demos; items use relative imports");
      const m = spec.match(REGISTRY_PREFIX);
      if (!m) return fail(spec, "has an unknown shape");
      return `${KIND_ALIAS[m[1] as ItemKind]}/${m[2]}`;
    }

    // 3. relative imports
    if (spec.startsWith(".")) {
      if (!own) return spec; // demos may use relative imports freely
      const hit = join(dirname(file), spec).match(ITEM_PATH);
      if (!hit) return fail(spec, "leaves the registry source tree");
      const [, kind, name] = hit as [string, ItemKind, string];
      if (kind === own[1] && name === own[2]) return spec; // inside the same item: unchanged
      siblings.set(`${kind}/${name}`, { kind, name }); // another Sulaf item
      return `${KIND_ALIAS[kind]}/${name}`;
    }

    // 4. app aliases are never allowed in item source
    if (spec.startsWith("@/") || spec.startsWith("~/"))
      return fail(spec, "uses an app alias; use @sulaf/ui/... or a relative import");

    // 5. bare npm packages
    const pkg = packageName(spec);
    if (pkg !== "vue") packages.add(pkg);
    return spec;
  };

  const code_out = code.replace(SPECIFIER, (match, lead: string, quote: string, spec: string) => {
    const next = map(spec);
    return next === spec ? match : `${lead}${quote}${next}${quote}`;
  });

  return {
    code: code_out,
    primitives: [...primitives].sort(),
    siblings: [...siblings.values()],
    packages: [...packages].sort(),
  };
}
