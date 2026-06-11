---
"@arshad-shah/swift-chart": patch
---

Internal: resolve two transitive advisories flagged by `pnpm audit` via `pnpm.overrides` — `devalue` (GHSA-77vg-94rm-hx3p, high; pulled in by the docs site through `@astrojs/react`) is pinned to `>=5.8.1`, and `brace-expansion` (GHSA-jxxr-4gwj-5jf2, moderate; pulled in by `@typescript-eslint`) to `>=5.0.6`. Both are dev/build-only dependencies — the published bundle is unaffected.
