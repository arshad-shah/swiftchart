---
'@arshad-shah/swift-chart': patch
---

Theme system robustness: dev warnings + safe fallbacks for the four most common theme misuses.

In development builds (`process.env.NODE_ENV !== 'production'`), the theme resolver now surfaces three classes of misuse via `console.warn`:

- **Unknown theme name.** `theme: 'rd-light'` when no `addTheme('rd-light', …)` has run used to fall through silently to `midnight`. It still falls back, but now logs `[SwiftChart] Theme "rd-light" is not registered — falling back to "midnight". Available themes: …` so the misnaming is visible.
- **`addTheme` with missing required fields.** `addTheme('brand', { bg: '#fff' })` left `surface`/`grid`/`text`/`textMuted`/`axis`/`colors` as `undefined`. Subsequent `ctx.fillStyle = undefined` was silently rejected by the canvas (the previous fillStyle was reused), producing baffling renders. Missing fields are now **backfilled from midnight** so production never ships with `undefined` colours, and the dev warning lists which fields were filled in.
- **`addTheme` shadowing a built-in name** (`midnight`, `arctic`, `ember`, `forest`). The override still applies — this is intentional flexibility — but a warning fires so accidental overrides aren't silent.

Production builds drop the warnings entirely.

Also tightens `Tooltip`'s inline-color sanitiser: the previous `/^[a-zA-Z]+$/` regex let typos like `'foobar'` through (browsers then silently rejected the invalid background). The check now uses `CSS.supports('color', candidate)` when available, with a tighter explicit-prefix fallback for environments that don't expose `CSS.supports`.

Adds 11 regression tests and a "Diagnostics" section to the Theming guide.

Closes #24.
