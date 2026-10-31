import { createHash } from "node:crypto";
import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import tailwindcss from "@tailwindcss/vite";

import { siteConfig } from "./app/lib/siteConfig";

// apps/docs/nuxt.config.ts -> repo root is two levels up
const fromRoot = (p: string) => fileURLToPath(new URL(`../../${p}`, import.meta.url));
const CONTENT_DIR = fileURLToPath(new URL("./content", import.meta.url));

// Docs version = hash of all .md files, computed at BUILD time (no fs reads at request time).
function getAllMdFiles(dirPath: string, files: string[] = []): string[] {
  for (const entry of readdirSync(dirPath)) {
    const full = join(dirPath, entry);
    if (statSync(full).isDirectory()) getAllMdFiles(full, files);
    else if (entry.endsWith(".md")) files.push(full);
  }
  return files;
}

function computeDocsVersion(): string {
  try {
    const hash = createHash("md5");
    for (const file of getAllMdFiles(CONTENT_DIR).sort())
      hash.update(`${file}:${statSync(file).mtimeMs}`);
    return hash.digest("hex").slice(0, 8);
  } catch {
    return "unknown";
  }
}

const DOCS_VERSION = computeDocsVersion();

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  devtools: { enabled: true },

  modules: [
    "@vueuse/nuxt",
    "@nuxtjs/color-mode",
    "@nuxt/a11y",
    "@nuxt/hints",
    "nuxt-og-image",
    "@nuxt/content",
    "nuxt-shiki",
    "@nuxt/fonts",
    "@nuxt/image",
  ],

  // ONE alias per workspace package (Phase 6 adds @sulaf/registry here)
  alias: {
    "@sulaf/ui": fromRoot("packages/ui/src"),
  },

  runtimeConfig: {
    docsVersion: DOCS_VERSION,
  },

  routeRules: {
    "/": {
      prerender: true,
    },
    // Short aliases → real content paths (content lives under section folders)
    "/docs": {
      redirect: "/docs/getting-started/introduction",
    },
    "/docs/introduction": {
      redirect: "/docs/getting-started/introduction",
    },

    // Docs layout - uses navigation data, all docs pages
    // ISR: Generate at build/first request, cache for 1 hour, regenerate in background
    "/docs/**": {
      isr: 3600,
    },
    // Raw markdown content endpoint
    "/raw/**": {
      headers: {
        "Cache-Control": "public, max-age=3600, s-maxage=3600",
      },
    },
  },

  site: {
    url:
      process.env.NUXT_SITE_URL ||
      (process.env.NODE_ENV === "production" ? siteConfig.url : undefined),
    name: siteConfig.name,
    description: siteConfig.description,
  },

  ogImage: {
    defaults: {
      width: 1200,
      height: 630,
    },
  },

  css: ["~/assets/css/main.css"],

  vite: {
    build: {
      chunkSizeWarningLimit: 1024,
      rolldownOptions: {
        checks: {
          bundlerTimings: false,
          pluginTimings: false,
        },
      },
    },
    optimizeDeps: {
      include: [
        "@lucide/vue",
        "@vue/devtools-core",
        "@vue/devtools-kit",
        "class-variance-authority",
        "clsx",
        "cn",
        "reka-ui",
        "shiki/langs/astro.mjs",
        "shiki/langs/bash.mjs",
        "shiki/langs/html.mjs",
        "shiki/langs/javascript.mjs",
        "shiki/langs/js.mjs",
        "shiki/langs/json.mjs",
        "shiki/langs/markdown.mjs",
        "shiki/langs/md.mjs",
        "shiki/langs/toml.mjs",
        "shiki/langs/ts.mjs",
        "shiki/langs/tsx.mjs",
        "shiki/langs/typescript.mjs",
        "shiki/langs/vue.mjs",
        "shiki/langs/yaml.mjs",
        "shiki/themes/github-dark.mjs",
        "shiki/themes/github-light-default.mjs",
        "shiki/themes/min-dark.mjs",
        "shiki/themes/min-light.mjs",
        "tailwind-merge",
      ],
    },
    plugins: [tailwindcss()],
  },

  // Primitives are auto-registered from the shared library. Docs owns none.
  // `extensions: ['vue']` stops Nuxt from registering each folder's index.ts as a component.
  components: [
    {
      path: fromRoot("packages/ui/src/components/ui"),
      pathPrefix: false,
      extensions: ["vue"],
    },
    {
      path: "~/components",
      ignore: ["_internal/*", "_internal/**/*", "examples/*", "examples/**/*"],
    },
    { path: "~/components/demo", pathPrefix: false },
    { path: "~/components/content", global: true, pathPrefix: false },
  ],

  shiki: {
    defaultTheme: {
      light: "github-light-default",
      dark: "github-dark",
    },
    bundledLangs: [
      "ts",
      "tsx",
      "js",
      "vue",
      "html",
      "json",
      "bash",
      "astro",
      "toml",
      "yaml",
      "md",
      "markdown",
    ],
  },

  fonts: {
    priority: ["bunny", "fontsource"],
    providers: {
      google: false,
      googleicons: false,
    },
    defaults: {
      weights: ["400", "500", "600", "700"],
      styles: ["normal"],
      subsets: ["latin"],
    },
    families: [
      { name: "Inter", provider: "bunny", global: true },
      { name: "Geist", provider: "bunny", weights: ["400", "500", "600"], global: true },
    ],
  },

  content: {
    build: { markdown: { highlight: false } },
    // required to prevent a better-sqlite3 error during build and deploy
    experimental: { sqliteConnector: "better-sqlite3" },
  },

  build: {
    transpile: ["vue-sonner"],
  },

  nitro: {
    externals: {
      inline: ["vue"],
    },
    devStorage: {
      cache: {
        driver: "memory",
      },
    },
    rollupConfig: {
      onwarn(warning, rollupWarn) {
        if (warning.code === "UNUSED_EXTERNAL_IMPORT") {
          return;
        }
        if (
          !["CIRCULAR_DEPENDENCY", "EVAL"].includes(warning.code || "") &&
          !warning.message?.includes("Unsupported source map comment")
        ) {
          rollupWarn(warning);
        }
      },
    },
    prerender: {
      crawlLinks: true,
      routes: ["/"],
      failOnError: false,
      autoSubfolderIndex: false,
    },
  },

  experimental: {
    routeTypedFetch: true,
  },
  app: {
    head: {
      link: [
        // { rel: "manifest", href: "/site.webmanifest" },
        { rel: "icon", type: "image/x-icon", href: "/favicon.ico" },
      ],
      meta: [
        {
          name: "keywords",
          content: "Nuxt,Vue,Tailwind CSS,Components,shadcn",
        },
      ],
    },
  },
  hooks: {
    "content:file:afterParse"({ file, content }) {
      if (file.path && file.path.endsWith(".md")) {
        try {
          const stats = statSync(file.path);
          content.lastUpdated = stats.mtime.toISOString();
        } catch {
          // ignore
        }
      }
    },
  },
});
