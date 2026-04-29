# SwiftChart Documentation Site

Astro Starlight site for the `@arshad-shah/swift-chart` library. Deployed to Cloudflare Pages.

## Local development

```bash
pnpm install
pnpm --filter swiftchart-docs dev
```

## Production build

```bash
pnpm --filter swiftchart-docs build
pnpm --filter swiftchart-docs preview
```

The build script runs in this order:

1. Builds the library (`pnpm --filter @arshad-shah/swift-chart build`).
2. Generates the API reference (`typedoc`).
3. Builds the static site (`astro build`) into `docs/dist/`.

## Cloudflare Pages settings

| Setting | Value |
|---|---|
| Build command | `pnpm install && pnpm --filter swiftchart-docs build` |
| Build output directory | `docs/dist` |
| Root directory | (repo root) |
| Environment variables | `NODE_VERSION=20`, `PNPM_VERSION=10` |

## Adding a new chart guide

1. Create `src/content/docs/charts/<kind>.mdx`.
2. Use any existing chart guide (e.g. `line.mdx`) as a template.
3. Reference example datasets from `src/components/ExampleData.ts` (add new ones if needed).
4. Wrap previews with `<ChartPreview client:visible ...>`.
