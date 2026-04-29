# Contributing to SwiftChart

Thanks for your interest. This file is a quick orientation for hacking on
the library. The full code-of-conduct lives in
[CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md); the security disclosure process
lives in [SECURITY.md](./SECURITY.md).

## Local setup

The repo is a pnpm workspace. Node is pinned via Volta in
`package.json` (`24.15.0`).

```bash
pnpm install
pnpm typecheck                              # tsc --noEmit
pnpm lint                                   # eslint flat config
pnpm test                                   # vitest run (jsdom + canvas mock)
pnpm build                                  # tsup -> dist/esm and dist/cjs
pnpm --filter swiftchart-docs dev           # docs site at http://localhost:4321
```

A single `pnpm validate` runs typecheck, lint, tests, build, publint, attw,
and size-limit in sequence. CI runs the same matrix on Node 18.18 / 20 / 22.

## Project layout

```
src/
  core/        BaseChart, themes, animator, tooltip
  charts/      LineChart, BarChart, PieChart, extras
  perf/        LTTB, quadtree, viewport, streaming, offscreen
  react/       <Line/>, <Bar/>, ... React wrappers
  utils/       helpers (niceScale, arrayMin/Max, escapeHtml, hexToRgba)
  types/       all public TypeScript surface
tests/         vitest specs grouped by module
docs/          Astro Starlight documentation site
```

## Coding rules

These rules exist because they are paid for by past incidents. Don't relax
them without discussion in an issue first.

- **No new runtime dependencies in `src/`.** The library must remain
  zero-dep. Dev dependencies and tooling can be added freely.
- **No `innerHTML` for user-derived content.** Build DOM nodes and use
  `textContent`. The XSS regression test will catch regressions.
- **No `Math.min(...arr)` / `Math.max(...arr)`.** These call-stack-overflow
  on large arrays. Use `arrayMin`, `arrayMax`, `arraysExtent` from
  `utils/helpers.ts`.
- **No hard-coded colours in chart drawing code.** Pull from `this.theme`
  (including `theme.positive`, `theme.negative`, `theme.onAccent`) so
  themes work end-to-end.
- **No SSR-unsafe module-level DOM access.** Touching `document` or
  `window` must be inside a constructor or method, not at import time.
- **Public API stability.** Anything exported from `src/index.ts` or
  `src/react/index.tsx` is part of the public API. Renames or removals
  are breaking changes; mark them in `CHANGELOG.md` as such.
- **Type-first.** Every public surface change ships with updated types and
  TSDoc comments (with `@example`) so the auto-generated API reference
  stays useful.

### Tests

- Every bug fix lands with a regression test that fails on the previous
  code.
- New chart types ship with a behaviour test (`tests/charts/`) and a snapshot
  of the resolved data shape.
- The React surface tests live in `tests/react/components.test.tsx`. Test
  the wrapper, not the inner Canvas (the underlying chart is already
  covered by its own tests).

### Performance

Hot paths to keep tight:

- Per-frame draw routines in `src/charts/*` and `src/core/base.ts`.
- `lttb*`, `quadtree`, `viewport`, `offscreen`, `streaming` in `src/perf/`.

Don't allocate inside the per-frame draw loop. Reuse arrays, avoid
spreads, prefer for-loops over `.forEach` in hot paths. If you need to
benchmark, see `tests/perf/profiling.test.ts`.

### Bundle size

The size budgets in `package.json` (`size-limit`) are enforced in CI:

- core: 13 KB gzipped
- React entry: 13 KB gzipped

If your change pushes either entry over budget, either reduce the cost or
open a discussion explaining why the budget should move.

## Documentation

For any user-visible change:

1. Update or add a page under `docs/src/content/docs/`.
2. Update or add a JSDoc `@example` block on the relevant exported type or
   class.
3. Add an entry to `CHANGELOG.md` under `[Unreleased]`.

The docs site builds from the same workspace, so a single `pnpm install`
sets you up for both library and docs work.

## Sending a PR

1. Fork the repo and branch from `main`.
2. Make focused commits. Conventional commit prefixes (`feat:`, `fix:`,
   `docs:`, `chore:`, `refactor:`, `test:`, `ci:`) help future-you read the
   log; they are not strictly required.
3. Run `pnpm validate` locally before pushing.
4. Open a PR using the template. CI runs the full matrix and the package
   validation suite.
5. The maintainer will review and either merge or leave feedback. Reviews
   focus on correctness, public-API stability, and the rules above.

## Releases

Releases are cut from `main` by the maintainer:

1. Update `CHANGELOG.md`: move `[Unreleased]` content under a new version.
2. Bump `version` in `package.json`.
3. Tag and push: `git tag -a vX.Y.Z -m 'Release vX.Y.Z' && git push --tags`.
4. Create a GitHub Release on the tag. Publishing the release fires the
   `publish.yml` workflow which pushes to GitHub Packages automatically.
5. To also publish to npm.org, dispatch `publish.yml` manually with
   `registry=npm` (requires the `NPM_TOKEN` repo secret).

Versions follow [SemVer](https://semver.org/). Breaking API changes ship
in a new major; new features in a minor; bug fixes in a patch.
