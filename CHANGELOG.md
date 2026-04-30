# Changelog

## 1.1.0

### Minor Changes

- [#12](https://github.com/arshad-shah/swiftchart/pull/12) [`b33c48a`](https://github.com/arshad-shah/swiftchart/commit/b33c48aaee8b11cdc1dde9dc0f2f3f369af54b47) Thanks [@arshad-shah](https://github.com/arshad-shah)! - # 12 new chart types, step-line option, composable drawing primitives

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

### Patch Changes

- [#12](https://github.com/arshad-shah/swiftchart/pull/12) [`6e84878`](https://github.com/arshad-shah/swiftchart/commit/6e84878f6ee91a5c379fdd3335dca63d060b5bb3) Thanks [@arshad-shah](https://github.com/arshad-shah)! - # Algorithmic + correctness fixes

  Eight bugs identified and fixed:

  - **`squarify` was O(n²)** despite the docstring claiming linear. Three
    sources: per-iteration `sumValues(remaining)` recompute,
    `remaining.slice(...)` reallocation, and `appendRow` that allocated a
    fresh array on every inner-loop step (the comment claiming
    "Allocation-free" was wrong). Rewritten to walk the input with an index
    cursor, maintain a running `remainingTotal` that's decremented after
    each row, and pass the candidate item to `worstAspect` as an extra
    parameter so it never builds `[...row, candidate]`. New regression
    test: 5000 items lay out in well under O(n²) time.

  - **`layoutSankey`'s topo walk was O(n²)** because it used
    `queue.shift()` (which on a JS array is O(n) per pop). Replaced with a
    cursor (`for (let qi = 0; qi < queue.length; qi++)`), keeping the walk
    to O(nodes + links). New regression test: 1000-node chain DAG lays out
    in well under 500 ms (was multi-second on the old path).

  - **`layoutSankey`'s `ky` could go negative** when the requested rect
    was shorter than the per-column padding alone required, producing
    negative node heights and broken layout bounds. Now clamps available
    height to `Math.max(0, opts.h - nodePadding × maxGaps)`. New
    regression test: 10 nodes in 50 px height with 12 px padding (108 px
    of padding total > 50 px rect) produces every node with `h ≥ 0`.

  - **`lerpColor` documented "any CSS-ish colour" but only handled hex /
    `rgb()` / `rgba()`.** Named colours (`red`), `hsl()`, `oklch()`,
    `color-mix()` etc. silently fell back to black, producing wrong heatmap
    output. Added a lazily-instantiated 1×1 canvas fallback that delegates
    parsing to the host browser (which understands every CSS colour syntax
    it supports), then re-parses the canvas's normalised result through the
    fast path. SSR-safe (stays `null` outside a browser). The fast hex /
    rgb paths still allocate nothing.

  - **BubbleChart hover query was hard-coded at 24 px** but bubbles can
    render up to `maxRadius` (default 40 px) — hovering on a large bubble
    whose centre was > 24 px from the cursor would silently miss. Now
    queries with `Math.max(24, maxRadius + 4)` AND verifies the cursor
    lies within the candidate's _actual_ painted radius (so the hit is
    precise: only inside the visible disc, never the empty space the
    larger query window covered). Regression test asserts both halves.

  - **SankeyChart re-laid-out on every draw.** `_draw` unconditionally set
    `this._layout = null`, defeating the cache in `_ensureLayout` —
    `layoutSankey` ran on every animation frame and every hover redraw.
    Now caches against `(plotArea.w, plotArea.h)` and only invalidates on
    resize, `setSankey`, or a config patch. Regression test asserts the
    cached object is reused across consecutive draws.

  - **NetworkChart seeded against `this.width / this.height`** (the full
    canvas, including title and padding regions) and centred its force
    simulation there, so initial nodes could land on the title and the
    centring force pulled toward the wrong centre. Now seeds and centres
    against `this.plotArea`. Regression test asserts every seeded node
    position is within `plotArea`.

  920/920 tests pass; all sizes under their respective `size-limit`
  budgets (full barrel 19.79 KB brotli vs. 21 KB budget).

All notable changes to this project are documented here.
Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), versioning: [SemVer](https://semver.org/).

## [1.0.0] - 2026-04-29

First stable release of `@arshad-shah/swift-chart`.

### Added

- **13 chart types**: `LineChart`, `BarChart`, `PieChart` (with donut variant),
  `ScatterChart`, `RadarChart`, `GaugeChart`, `HBarChart`, `Sparkline`,
  `StackedAreaChart`, `WaterfallChart`, `TreemapChart`.
- **First-class React bindings** at `@arshad-shah/swift-chart/react`: `Line`,
  `Area`, `Bar`, `HBar`, `Pie`, `Donut`, `Scatter`, `Radar`, `Gauge`,
  `SparklineComponent`, `StackedArea`, `Waterfall`, `Treemap`.
- **Schema-agnostic data ingestion** via `DataMapping`: auto-detect string
  and numeric fields, or pick fields explicitly with `x` / `y` /
  `labelField` / `valueField` / `seriesNames`. Pre-built
  `{ labels, datasets }` shape also supported.
- **Built-in themes**: `midnight`, `arctic`, `ember`, `forest`. Register
  custom themes by name with `addTheme(name, theme)`. `Theme` now exposes
  semantic `positive`, `negative`, and `onAccent` colours so
  HBar/Waterfall/Treemap/StackedArea can theme cleanly.
- **Performance primitives**: LTTB downsampling, quadtree-backed hover for
  scatter, viewport culling, OffscreenCanvas composite renderer, and a
  ring-buffer `StreamBuffer` for streaming series.
- **Animations**: configurable per chart with `animate`, `animDuration`,
  `animEasing`. Easings: `linear`, `easeOutCubic`, `easeOutElastic`,
  `easeInOutQuart`, `easeOutBack`.
- **Accessibility**: `BaseChartConfig.ariaLabel` and `ariaDescription` set
  `role="img"`, `aria-label`, `aria-description`, and `tabIndex` on the
  canvas so screen readers can announce charts.
- **Touch support**: `touchstart` / `touchmove` / `touchend` events
  synthesise mouse interactions so tooltip and hover work on mobile.
- **Imperative APIs**: `BaseChart.update(patch)` to change theme, title,
  padding, easing, duration, or ariaLabel at runtime without recreating
  the chart. `BaseChart.toDataURL()` exports a chart as PNG.
  `ChartRef.toDataURL()` provides the same from React.
- **Layout**: `legendPosition: 'top' | 'bottom' | 'left' | 'right' | 'none'`
  is fully wired up.
- **Utilities**: `niceScale`, `niceNum`, `shortNum`, `clamp`, `lerp`, `dpr`,
  `hexToRgba` (`#RGB` / `#RRGGBB` / `#RRGGBBAA` / `rgb()` / `rgba()`),
  `escapeHtml`, `arrayMin`, `arrayMax`, `arraysExtent`, `resolveData`.
- **Tooltip**: safe-by-default `Tooltip.showStructured(x, y, content)` for
  rich content (title, rows, footer). The legacy `tooltip.show(text)` is
  treated as plain text.
- **Documentation site** at <https://swiftchart.arshadshah.com> with
  guides, live previews, and a complete TypeDoc API reference for both
  the core and React entry points.
- **Tooling**: ESLint flat config, `publint`, `arethetypeswrong`,
  `size-limit` validation, GitHub Actions CI workflow.
- **Build**: dual-package ESM + CJS via `tsup`, `sideEffects: false`,
  per-entry size budgets (core ≤ 13 KB gzipped, React ≤ 13 KB gzipped).
- **Compatibility**: Node `^18.18 || ^20 || >=22`. Browsers: Chrome 64+,
  Firefox 69+, Safari 13.1+, Edge 79+.

### Security

- **Tooltip XSS hardening.** All tooltip rendering goes through DOM
  construction with `textContent` for user-supplied fields. A series
  label or label string can no longer inject HTML or script into the
  tooltip.

### Notes for SSR consumers

React components declare `'use client'`. Constructing a chart in a server
context throws a clear error so the issue surfaces at build time rather
than silently rendering blank canvases.
