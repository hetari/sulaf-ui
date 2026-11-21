import { isBuiltin } from "node:module";

import { dirname, join } from "pathe";
import { RegistryValidationError } from "shadcn-vue/registry";
import { type RegistryItem, rawConfigSchema } from "shadcn-vue/schema";
import ts from "typescript";
import { parse as parseSFC } from "vue/compiler-sfc";

import { updateImportAliases } from "./shadcn-import-aliases";

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

// repo-relative path of a file inside an item folder: src/<kind>/<name>/...
const ITEM_PATH = /^src\/(ui|blocks|hooks|lib)\/([^/]+)(?:\/|$)/;
const PRIMITIVE_PREFIX = "@sulaf/ui/components/ui/";
/** Staged prefixes; shadcn-vue updateImportAliases rewrites these to components.json aliases on install. */
const STAGED_REGISTRY_PREFIX: Record<ItemKind, string> = {
  ui: "@/registry/sulaf/ui",
  blocks: "@/registry/sulaf/components",
  hooks: "@/registry/sulaf/composables",
  lib: "@/registry/sulaf/lib",
};
/** Nested kind directory segments (e.g. `/ui/`) are not installer-safe unless on-disk paths match. */
const INSTALLER_NESTED_KIND_DIR = /\/(ui|components|composables|lib)(?=\/)/;
/** Item or file segments starting with a kind token trip shadcn-vue's greedy `/ui` match. */
const INSTALLER_KIND_TOKEN = /^(ui|components|composables|lib)(?=[-./]|$)/;
/**
 * Staged cn specifier rewritten by shadcn-vue `updateImportAliases` + utils retarget.
 * Uses the registry lib path so `aliases.lib` (default `@/lib`) maps to `@/lib/utils`
 * even when `aliases.components` uses a different path root (e.g. `~/components`), which
 * satisfies shadcn-vue@2.8.2 retarget (`updatedImport === "@/lib/utils"`).
 * For non-default `aliases.lib`, installers still resolve `${aliases.lib}/utils`; cn
 * must live at that path or use the canonical `@/lib/utils` retarget flow (see tests).
 */
export const STAGED_UTILS_SPEC = `${STAGED_REGISTRY_PREFIX.lib}/utils`;
/** `@/lib/utils` after install when default aliases are used. */
export const STAGED_UTILS_CANONICAL_SPEC = DEFAULT_ALIASES.utils;
export const STAGED_UTILS_REGISTRY_SPEC = STAGED_UTILS_SPEC;
const REGISTRY_PREFIX = /^@sulaf\/registry\/(ui|blocks|hooks|lib)\/([^/]+)$/;
const SULAF_UTILS_SPEC = "@sulaf/ui/lib/utils";

const encodeStringLiteral = (value: string, quote: string): string =>
  quote === '"'
    ? JSON.stringify(value)
    : `'${value.replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/\n/g, "\\n").replace(/\r/g, "\\r")}'`;

const scriptKind = (filename: string, lang?: string | null): ts.ScriptKind => {
  const token = (lang ?? filename.replace(/.*\./, "")).toLowerCase();
  if (token === "tsx") return ts.ScriptKind.TSX;
  if (token === "jsx") return ts.ScriptKind.JSX;
  if (token === "js") return ts.ScriptKind.JS;
  return ts.ScriptKind.TS;
};

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

  /** shadcn-vue@2.8.2 retargets aliases.utils only for `import { cn } from "@/lib/utils"`. */
  const assertUtilsImportForm = (node: ts.ImportDeclaration): void => {
    if (!node.moduleSpecifier || !ts.isStringLiteralLike(node.moduleSpecifier)) return;
    if (node.moduleSpecifier.text !== SULAF_UTILS_SPEC) return;
    const spec = node.moduleSpecifier.text;
    const clause = node.importClause;
    if (!clause || clause.name) fail(spec, 'must use `import { cn } from "@sulaf/ui/lib/utils"`');
    else if (!clause.namedBindings || !ts.isNamedImports(clause.namedBindings))
      fail(spec, 'must use `import { cn } from "@sulaf/ui/lib/utils"`');
    else {
      if (clause.isTypeOnly)
        fail(spec, 'must use a value `import { cn } from "@sulaf/ui/lib/utils"`');
      let hasValueCn = false;
      for (const el of clause.namedBindings.elements) {
        if (el.isTypeOnly) continue;
        const imported = (el.propertyName ?? el.name).text;
        if (imported !== "cn" || el.name.text !== "cn" || el.propertyName)
          fail(
            spec,
            "must import `cn` with that local name so shadcn-vue can retarget aliases.utils",
          );
        hasValueCn = true;
      }
      if (!hasValueCn)
        fail(spec, "must include a value import of `cn` so shadcn-vue can retarget aliases.utils");
    }
  };

  const assertDynamicUtilsImport = (spec: string): void => {
    if (spec !== SULAF_UTILS_SPEC) return;
    fail(
      spec,
      'must use a static `import { cn } from "@sulaf/ui/lib/utils"`; dynamic import cannot be retargeted by the installer',
    );
  };

  const stageSiblingImport = (
    kind: ItemKind,
    name: string,
    subpath: string,
    spec: string,
  ): string => {
    if (INSTALLER_KIND_TOKEN.test(name)) {
      fail(
        spec,
        "item names must not start with a kind token (ui, components, composables, lib); rename the item (e.g. ui-card)",
      );
    }
    const staged = `${STAGED_REGISTRY_PREFIX[kind]}/${name}${subpath}`;
    const expected = `${KIND_ALIAS[kind]}/${name}${subpath}`;
    if (updateImportAliases(staged, { aliases: DEFAULT_ALIASES }) !== expected) {
      fail(
        spec,
        "would resolve to an installer-unsafe path under shadcn-vue@2.8.2; avoid kind tokens in item names and file paths (e.g. ui-helper)",
      );
    }
    return staged;
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
      return `${STAGED_REGISTRY_PREFIX.ui}/${rest}`;
    }
    if (spec === SULAF_UTILS_SPEC) return STAGED_UTILS_SPEC;
    if (spec.startsWith("@sulaf/ui/dev/")) return spec; // removed later by the icon transform (Phase 8)
    if (spec.startsWith("@sulaf/ui/"))
      return fail(spec, "is outside the import contract (see §4.3)");

    // 2. demos may import registry items by package alias; items may not
    if (spec.startsWith("@sulaf/registry/")) {
      if (mode === "item")
        return fail(spec, "is only allowed in demos; items use relative imports");
      const m = spec.match(REGISTRY_PREFIX);
      if (!m) return fail(spec, "has an unknown shape");
      const kind = m[1] as ItemKind;
      const name = m[2]!;
      siblings.set(`${kind}/${name}`, { kind, name });
      return stageSiblingImport(kind, name, "", spec);
    }

    // 3. relative imports
    if (spec.startsWith(".")) {
      if (!own) return spec; // demos may use relative imports freely
      const hit = join(dirname(file), spec).match(ITEM_PATH);
      if (!hit) return fail(spec, "leaves the registry source tree");
      const [, kind, name] = hit as [string, ItemKind, string];
      if (kind === own[1] && name === own[2]) return spec; // inside the same item: unchanged
      siblings.set(`${kind}/${name}`, { kind, name }); // another Sulaf item
      // Preserve any subpath that comes after the item-name segment (e.g. /Bar.vue).
      const resolved = join(dirname(file), spec);
      const subpath = resolved.slice(
        resolved.indexOf(`/${kind}/${name}`) + `/${kind}/${name}`.length,
      );
      if (INSTALLER_NESTED_KIND_DIR.test(subpath)) {
        fail(
          spec,
          "cross-item imports into nested kind-named directories (e.g. bar/ui/...) are not supported; import the item entry or a file that does not nest kind folder names",
        );
      }
      return stageSiblingImport(kind, name, subpath, spec);
    }

    // 4. app aliases are never allowed in item source
    if (spec.startsWith("@/") || spec.startsWith("~/"))
      return fail(spec, "uses an app alias; use @sulaf/ui/... or a relative import");
    if (spec.startsWith("#"))
      return fail(spec, "uses a framework import alias; use a package or relative import");

    // 5. bare npm packages
    const pkg = packageName(spec);
    if (pkg !== "vue" && !spec.startsWith("node:") && !isBuiltin(spec)) {
      packages.add(pkg);
    }
    return spec;
  };

  /**
   * Collect module-specifier string literal nodes from TypeScript/Vue source
   * via the TypeScript AST, so comments and ordinary string literals are
   * never mistaken for import specifiers.
   *
   * Returns nodes sorted in document order.
   */
  const collectSpecifierNodes = (
    src: string,
    scriptOffset: number,
    block: { filename: string; lang?: string | null },
  ): { start: number; end: number; text: string; installerRewritable: boolean }[] => {
    const sf = ts.createSourceFile(
      block.filename,
      src,
      ts.ScriptTarget.ESNext,
      true,
      scriptKind(block.filename, block.lang),
    );
    const nodes: { start: number; end: number; text: string; installerRewritable: boolean }[] = [];

    const visit = (node: ts.Node): void => {
      if (
        (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
        node.moduleSpecifier &&
        ts.isStringLiteralLike(node.moduleSpecifier)
      ) {
        if (ts.isImportDeclaration(node)) assertUtilsImportForm(node);
        nodes.push({
          start: node.moduleSpecifier.getStart(sf) + scriptOffset,
          end: node.moduleSpecifier.getEnd() + scriptOffset,
          text: node.moduleSpecifier.text,
          // shadcn-vue@2.8.2 transformImport only rewrites ImportDeclaration and dynamic import().
          installerRewritable: ts.isImportDeclaration(node),
        });
      } else if (
        ts.isImportTypeNode(node) &&
        ts.isLiteralTypeNode(node.argument) &&
        ts.isStringLiteral(node.argument.literal)
      ) {
        const lit = node.argument.literal;
        nodes.push({
          start: lit.getStart(sf) + scriptOffset,
          end: lit.getEnd() + scriptOffset,
          text: lit.text,
          installerRewritable: false,
        });
      } else if (
        ts.isCallExpression(node) &&
        node.expression.kind === ts.SyntaxKind.ImportKeyword &&
        (node.arguments.length === 1 || node.arguments.length === 2) &&
        ts.isStringLiteralLike(node.arguments[0]!)
      ) {
        // Accept both `import("pkg")` and `import("pkg", { assert: … })`; only rewrite the first arg.
        const arg = node.arguments[0]!;
        assertDynamicUtilsImport(arg.text);
        nodes.push({
          start: arg.getStart(sf) + scriptOffset,
          end: arg.getEnd() + scriptOffset,
          text: arg.text,
          installerRewritable: true,
        });
      }
      ts.forEachChild(node, visit);
    };
    visit(sf);
    return nodes;
  };

  // For Vue SFCs, parse the SFC to obtain active script and scriptSetup blocks with their offsets.
  // HTML comments containing script tags are ignored by the SFC parser.
  // When no SFC blocks are present at all, treat the whole string as a bare script (e.g. tests).
  type SpecNode = {
    start: number;
    end: number;
    text: string;
    installerRewritable: boolean;
  };
  let allSpecNodes: SpecNode[] = [];
  if (file.endsWith(".vue")) {
    const { descriptor } = parseSFC(code);
    if (descriptor.script?.src)
      fail(
        descriptor.script.src,
        "uses an external script reference; inline the script or use a relative import",
      );
    if (descriptor.scriptSetup?.src)
      fail(
        descriptor.scriptSetup.src,
        "uses an external script reference; inline the script or use a relative import",
      );
    if (descriptor.script) {
      allSpecNodes.push(
        ...collectSpecifierNodes(descriptor.script.content, descriptor.script.loc.start.offset, {
          filename: `${file}.ts`,
          lang: descriptor.script.lang,
        }),
      );
    }
    if (descriptor.scriptSetup) {
      allSpecNodes.push(
        ...collectSpecifierNodes(
          descriptor.scriptSetup.content,
          descriptor.scriptSetup.loc.start.offset,
          { filename: `${file}.ts`, lang: descriptor.scriptSetup.lang },
        ),
      );
    }
    const hasSfcBlocks = Boolean(
      descriptor.template ||
      descriptor.script ||
      descriptor.scriptSetup ||
      descriptor.styles.length ||
      descriptor.customBlocks.length,
    );
    if (!hasSfcBlocks) {
      allSpecNodes = collectSpecifierNodes(code, 0, { filename: file });
    }
  } else {
    allSpecNodes = collectSpecifierNodes(code, 0, { filename: file });
  }

  // Sort descending by start position so back-to-front replacement keeps earlier positions valid.
  allSpecNodes.sort((a, b) => b.start - a.start);

  // Apply rewrites back-to-front so earlier positions stay valid.
  let code_out = code;
  for (const n of allSpecNodes) {
    const next = map(n.text);
    if (next === n.text) continue;
    if (!n.installerRewritable) {
      fail(n.text, "appears in a re-export or import() type; use a static import instead");
    }
    const q = code_out[n.start]!;
    code_out = code_out.slice(0, n.start) + encodeStringLiteral(next, q) + code_out.slice(n.end);
  }

  return {
    code: code_out,
    primitives: [...primitives].sort(),
    siblings: [...siblings.values()],
    packages: [...packages].sort(),
  };
}
