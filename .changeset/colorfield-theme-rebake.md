---
'@arshad-shah/swift-chart': patch
---

Fix: per-datum colours from `colorField` / `colorMap` now follow the active theme.

Categorical values that hashed into the theme palette were baked into `dataset.colors[]` (or, for Pie / Funnel / Treemap, into private `_itemColors`) at `setData` time using the *current* theme. Subsequent calls to `setTheme()` or `update({ theme })` swapped backgrounds, axes, and grid lines — but the bars, slices, and tiles kept the old palette indefinitely.

`BaseChart` now exposes a protected `_rebakeColorsForTheme()` hook that re-resolves `colorField` against the new palette without re-animating. The hook is called on both theme-change paths and is overridden by Pie, Funnel, and Treemap to redo their own per-datum bake. Charts without a `colorField` mapping skip the rebake entirely; the pre-built `{ labels, datasets }` shape is also untouched (the consumer owns colours there).

Explicit `colorMap` entries and verbatim CSS colour strings are still respected — only categorical values that fell through to the palette move.

Closes #21.
