---
"@arshad-shah/swift-chart": minor
---

# 12 new chart types, step-line option, composable drawing primitives

## New chart types

Adds 12 chart classes (and matching React components, docs pages, and example
data sets) so the catalogue grows from 13 → 25:

- **`StackedBarChart`** — vertical stack with optional `percent: true` for
  100 %-stacked bars. Stack edges reuse the same rounded-corner treatment as
  `BarChart` (top corners on the topmost positive segment only).
- **`BubbleChart`** — scatter plus a third magnitude on the radius. Quadtree
  hover for sub-millisecond lookups even at 10 k+ points.
- **`HeatmapChart`** — categorical 2-axis grid with a built-in colour-scale
  legend, dynamic X-axis label stride for dense grids, and a configurable
  `colorScale: [low, high]` ramp.
- **`CandlestickChart`** — financial OHLC. Configurable `upColor` /
  `downColor`. Wicks use round line caps; bodies pick up the standard hover
  glow.
- **`BoxplotChart`** — pre-computed `{min, q1, median, q3, max, outliers}` or
  raw samples (`mapping.y = 'samples'` with `number[]` per row). Whiskers
  computed via Tukey 1.5 × IQR fences using the new `fiveNumberSummary`
  helper.
- **`FunnelChart`** — drop-off / pyramid orientation with a vertical
  gradient fill. `pyramid: true` correctly mirrors each trapezoid (the wide
  edge anchors at the bottom of every slot, so adjacent stages join cleanly).
- **`SankeyChart`** — DAG-driven flow diagram. Layout is delegated to the
  new `layoutSankey` helper (column DAG + iterative relaxation, O(iters ×
  (links + nodes))) so it's reusable outside of the chart class.
- **`ComboChart`** — bars plus one or more line-series overlays sharing a
  single Y axis (`lineSeries: ['target']`).
- **`RadialBarChart`** — polar bar with two flavours: bar-length encoding
  (default) and Coxcomb / rose mode (`rose: true`, radius encodes value).
- **`BulletChart`** — Stephen Few KPI bullet with rounded range-band track,
  rounded value bar, and round-cap target tick.
- **`MarimekkoChart`** — variable-width stacked mosaic where column width
  encodes column total and segment height encodes the column's share split.
- **`NetworkChart`** — force-directed node-link graph powered by the new
  `simulateForce` helper (O(iters × n²) Verlet-style spring/charge solver).

## Step-line option on `LineChart`

Adds `step?: 'before' | 'after' | 'middle' | true` for staircase plots
(state-change data, financial daily closes, etc.). Mutually exclusive with
`smooth`. Default `'after'` if `step: true` is passed.

## Composable drawing primitives

New `src/core/draw.ts` module exposes the shared building blocks each
chart in the library uses, so consumers can write custom chart types
without re-deriving the visual conventions:

- `seriesColor(theme, dataset, idx)` — series colour with `dataset.color`
  override and palette modulo cycling.
- `yProj(scale, plotArea, t?)` / `xProj(scale, plotArea, t?)` — value
  projection functions that handle the animation progress factor.
- `applyHoverGlow(ctx, color, intensity?)` / `clearHoverGlow(ctx)` — the
  canvas shadow treatment used everywhere (`shadowColor` 30 % alpha,
  `shadowBlur` 12 px at intensity 1).
- `roundedBar(ctx, x, y, w, h, fill, opts)` — filled rectangle with
  per-corner radii and optional hover glow. Used internally by `BarChart`,
  `HBarChart`, `ComboChart`, `StackedBarChart`, `BulletChart`, `Waterfall`,
  `Treemap`, `Sankey`.

## New layout helpers (also re-exported from the public surface)

- `simulateForce` — O(iters × n²) deterministic spring/charge solver.
- `layoutSankey` — column DAG + iterative relaxation Sankey layout.
- `fiveNumberSummary` — Float64Array sort + Tukey whiskers; linear in
  sample size.
- `squarify` — Bruls/Huijsen/van Wijk squarified treemap layout (lifted
  out of `TreemapChart` so it's reusable).

## Bug fixes shipped with this release

- **`Sankey` and `Network` weren't rendering** when only `nodes` + `links`
  were passed (no `data` prop). The shared `useChart` hook's inline-data
  guard recognised `{labels, datasets}` but not `{nodes, links}`; now
  recognises both.
- **Tooltip stuck on screen during scroll/resize.** The tooltip is
  positioned `fixed` so any scroll on the window or any ancestor visually
  disconnects it from the chart canvas. It now hides on `scroll` (capture
  phase, passive) and `resize`, and the listeners are removed on
  `destroy()`.
- **Funnel `pyramid: true` had visual discontinuities** at every row
  boundary — slots were repositioned but each trapezoid still narrowed
  downward. Now mirrors the trapezoid in pyramid mode so wide edges
  anchor at the bottom of each slot and adjacent stages join cleanly.
- **Heatmap had excess whitespace and dense X labels overlapped.**
  Padding tightened to `{top: 8, right: 28, bottom: 26, left: 44}`; X-axis
  labels now use a stride based on label width vs. column width.
- **Mobile docs site regressed**: the "browser-extension hardening" CSS
  was forcing `nav.sidebar`'s `.sl-flex` descendants to
  `visibility: visible !important`, which defeated Starlight's mobile menu
  hide mechanism (sidebar tree showed when the hamburger was closed). The
  custom search-trigger styling also applied at every viewport, making
  the mobile icon-button look chunky. Both removed; comparison-table
  numbers re-grounded against bundlephobia.

## Bundle size

Tree-shaken usage (the realistic measurement now enforced by
`size-limit`):

- `LineChart` only — 6.14 KB brotli
- `LineChart + BarChart` — 6.6 KB brotli
- Six common charts — 9.51 KB brotli
- Full barrel (all 23 chart classes + helpers) — 19.58 KB brotli
- Full React bundle — 19.2 KB brotli
