# @sulaf/docs

Documentation site for Sulaf. Nuxt 4, Nuxt Content 3, MDC, Tailwind 4.
Adopted from `hetari/shadcn-docs-template`. Primitives come from `@sulaf/ui`. Docs owns no primitive.

## Run (from the repo root)

- `pnpm dev` (or `pnpm docs:dev`)
- `pnpm docs:build`
- `pnpm docs:preview`
- `pnpm docs:typecheck`
- `pnpm docs:prepare` (regenerates aliases and types)

## Layout

- `app/assets/css/main.css`: imports the library tokens, defines none
- `app/components/content/`: MDC components used inside markdown (global)
- `app/components/demo/`: demo wrappers
- `app/components/docs/`: Sulaf docs chrome (new components go here)
- `content/docs/`: markdown pages (schema in `content.config.ts`)
- `server/`: Nitro routes (search, raw markdown)
- `shared/`, `public/`

## Import rules

| Need                  | Write                                                                                 |
| --------------------- | ------------------------------------------------------------------------------------- |
| A primitive           | `import { Button } from '@sulaf/ui/components/ui/button'` (folder, never a deep file) |
| `cn()`                | `import { cn } from '@sulaf/ui/lib/utils'`                                            |
| Something in docs     | `~/components/...`                                                                    |
| `@/...`               | never                                                                                 |
| `~/components/ui/...` | never, that folder does not exist                                                     |

## Adding things

- A primitive that is not installed: `pnpm ui:add <name>`, commit. Never copy a file into docs.
- A docs-only component: `app/components/docs/<Name>.vue`.
- A component users install: it belongs in `packages/registry`, not here.
- A docs page: `content/docs/<section>/<slug>.md`.

## Troubleshooting

- `Failed to resolve component`: run `nuxi prepare`; check the name exists in `packages/ui/src/components/ui`.
- Unstyled primitives: the `@source` path in `main.css` is wrong (five `../` from that file reach the repo root).
- `Cannot find module '@sulaf/ui/...'`: the `alias` entry in `nuxt.config.ts` is missing; run `nuxi prepare`.
- Content build fails on sqlite: `better-sqlite3` must be in `onlyBuiltDependencies`.
