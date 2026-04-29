# Contributing to SwiftChart

Thanks for your interest! This file is a quick orientation for hacking on the library.

## Local setup

```bash
npm ci
npm run typecheck   # tsc --noEmit
npm run lint        # eslint flat config
npm test            # vitest run (jsdom + canvas mock)
npm run build       # tsup → dist/esm and dist/cjs
```

A single `npm run validate` runs typecheck + lint + tests + build + publint
+ arethetypeswrong + size-limit. CI runs the same matrix on Node 18.18 / 20 / 22.

## Project layout

```
src/
  core/        BaseChart, themes, animator, tooltip
  charts/      LineChart, BarChart, PieChart, extras
  perf/        LTTB, quadtree, viewport, streaming, offscreen
  react/       <Line/>, <Bar/>, … React wrappers
  utils/       helpers — niceScale, arrayMin/Max, escapeHtml, hexToRgba
  types/       all public TypeScript surface
tests/         vitest specs grouped by module
docs/          Astro Starlight documentation site (deployed to Cloudflare Pages)
```

## Coding rules

- **No new dependencies in `src/`.** The library must remain zero-dep.
  Devtools / tests can add devDependencies freely.
- **Never use `innerHTML` for user-derived content.** Build DOM nodes
  and use `textContent`. The XSS regression test will catch regressions.
- **No `Math.min(...arr)` / `Math.max(...arr)`** — these call-stack-overflow
  on large arrays. Use `arrayMin`, `arrayMax`, `arraysExtent` from `utils/helpers.ts`.
- **No hard-coded colors in chart drawing code.** Pull from `this.theme`
  (including `theme.positive`, `theme.negative`, `theme.onAccent`).
- **No SSR-unsafe module-level DOM access.** Touching `document` or
  `window` must be inside a constructor or method, not at import time.
- Tests: every bug fix gets a regression test.

## Sending a PR

1. Fork & branch from `main`.
2. Run `npm run validate` locally before pushing.
3. Add a `CHANGELOG.md` entry under `[Unreleased]`.
4. Open a PR; CI will run the full matrix.
