# Changelog

## 1.3.1

### Patch Changes

- [#60](https://github.com/arshad-shah/swiftchart/pull/60) [`6b1621b`](https://github.com/arshad-shah/swiftchart/commit/6b1621b228421722edd0a151951765983cf51819) Thanks [@arshad-shah](https://github.com/arshad-shah)! - Internal: resolve two transitive advisories flagged by `pnpm audit` via `pnpm.overrides` — `devalue` (GHSA-77vg-94rm-hx3p, high; pulled in by the docs site through `@astrojs/react`) is pinned to `>=5.8.1`, and `brace-expansion` (GHSA-jxxr-4gwj-5jf2, moderate; pulled in by `@typescript-eslint`) to `>=5.0.6`. Both are dev/build-only dependencies — the published bundle is unaffected.

- [#48](https://github.com/arshad-shah/swiftchart/pull/48) [`7347797`](https://github.com/arshad-shah/swiftchart/commit/734779740c3eda40ccc7cde032ffb23d97b76958) Thanks [@arshad-shah](https://github.com/arshad-shah)! - Internal: bump dev tooling to resolve advisories. Updates `canvas` 2→3, `jsdom` 25→29, `vitest` 2→4, playground `vite` 5→8, docs `astro` 5→6 and `@astrojs/starlight` 0.32→0.39. No runtime or API changes — the published bundle is unaffected.

- [#60](https://github.com/arshad-shah/swiftchart/pull/60) [`6b1621b`](https://github.com/arshad-shah/swiftchart/commit/6b1621b228421722edd0a151951765983cf51819) Thanks [@arshad-shah](https://github.com/arshad-shah)! - Fix: 4-digit shorthand hex colours (`#RGBA`, e.g. `#f008`) are now parsed correctly instead of silently falling back to black. Both the tooltip/fill helper (`hexToRgba`) and the colour-interpolation path (`lerpColor`, used by heatmap/choropleth gradients) now expand 4-digit hex the same way browsers do — doubling each digit and dropping the alpha channel. No API changes.

## 1.3.0

### Minor Changes

- [#32](https://github.com/arshad-shah/swiftchart/pull/32) [`40a46b7`](https://github.com/arshad-shah/swiftchart/commit/40a46b770afdc6bbedd910d5fdebd5e02891ce22) Thanks [@arshad-shah](https://github.com/arshad-shah)! - Accessibility umbrella: keyboard support, honest ARIA roles, live region, reduced-motion respect.

  The chart canvas now adapts to whether it's interactive:

  - **Interactive charts** (with `onClick` / `onPointClick`) drop the misleading `role="img"`, gain `aria-roledescription="interactive chart"`, get `tabIndex=0` plus a native focus ring, and respond to keyboard input — `Enter` / `Space` fire the click handler at the focused datum, `ArrowLeft` / `ArrowRight` walk the focus along the chart's primary axis (driving the existing hover + tooltip pipeline).
  - **Non-interactive charts** keep `role="img"` and stay out of the tab order — purely-decorative charts no longer pull keyboard focus into a dead element.

  Two more fixes:

  - **`aria-describedby` replaces non-standard `aria-description`.** Setting `ariaDescription` now mounts a hidden element inside the container and wires it via the standard attribute. `update({ ariaDescription })` patches the element in place.
  - **Polite live region announces data updates.** Each chart appends a hidden `role="status" aria-live="polite"` region; `setData()` writes a one-line summary to it (e.g. `"3 points, 2 series."`) so screen readers announce streaming / React-driven updates.
  - **`prefers-reduced-motion` is auto-respected.** When the user has `reduce-motion` set and `animate` is unspecified, animations are skipped. Explicit `animate: true` / `false` still wins.

  Adds a new `Accessibility` page to the docs guides covering all of the above.

  Closes [#22](https://github.com/arshad-shah/swiftchart/issues/22).

- [#27](https://github.com/arshad-shah/swiftchart/pull/27) [`e5b53f3`](https://github.com/arshad-shah/swiftchart/commit/e5b53f31684dd91c9763694c4b92160683c3fd4e) Thanks [@arshad-shah](https://github.com/arshad-shah)! - Theme system now reaches the tooltip, and `addTheme()` works from either entry point.

  **Tooltip theming.** The floating tooltip panel previously had hard-coded dark colours that ignored the active theme — light themes like `arctic` rendered a dark tooltip. Tooltip colours now derive from the active theme automatically, and `Theme` gains three optional fields for full control:

  - `tooltipBg` — falls back to `theme.surface`
  - `tooltipBorder` — falls back to `theme.axis`
  - `tooltipText` — falls back to `theme.text`

  `BaseChart` propagates the theme into `Tooltip` on construction, on `setTheme()`, and on `update({ theme })`, so live theme switches repaint the tooltip.

  **Cross-bundle theme registry (bug fix).** `addTheme()` was registering into a private map inside the core ESM bundle, while charts imported from `@arshad-shah/swift-chart/react` looked up theme names in a separate map inlined into the React bundle. Custom themes registered at app startup silently fell through to `midnight` when used via `<Line theme="my-theme" />`. The registry now lives on `globalThis`, so both bundles share one source of truth, and `THEMES` / `addTheme` / `resolveTheme` are now also re-exported from `@arshad-shah/swift-chart/react` for consumers who only import from the React entry.

- [#33](https://github.com/arshad-shah/swiftchart/pull/33) [`0efa5e8`](https://github.com/arshad-shah/swiftchart/commit/0efa5e8e4a9c7677604318fa8d9a2c1a4ce0cd0e) Thanks [@arshad-shah](https://github.com/arshad-shah)! - Tooltip mount fixes: Shadow DOM, modals/popovers, and nested scroll containers.

  The floating tooltip used to be appended directly to `document.body` and only listened to `window` scroll/resize. Three failure modes followed:

  - **Shadow DOM encapsulation broken.** A chart inside a web component rendered its tooltip into the light DOM, outside the shadow root.
  - **Stacking inversion in modals.** A chart inside a modal/popover with its own stacking context could render its tooltip _behind_ the modal, since the body-mounted tooltip wasn't part of that stacking context.
  - **Scroll on inner panels missed.** `scroll` doesn't bubble, so a single window listener never fired when an `overflow: auto` parent scrolled — the tooltip stayed floating at stale coordinates.

  Now:

  - The tooltip mounts next to the chart by default. Mount target priority: explicit `tooltipContainer` config → the canvas's shadow root if it has one → the chart container.
  - New `tooltipContainer?: HTMLElement` config option for explicit portal control (Radix-style).
  - `Tooltip` now walks the canvas ancestry at construction and attaches a `scroll` listener to every scrollable ancestor (any non-`visible` overflow), in addition to the window backstop. All listeners are cleaned up on `destroy()`.

  Closes [#23](https://github.com/arshad-shah/swiftchart/issues/23).

### Patch Changes

- [#31](https://github.com/arshad-shah/swiftchart/pull/31) [`e81ff0d`](https://github.com/arshad-shah/swiftchart/commit/e81ff0d99f68e13357471fea8b66029ca93d0f90) Thanks [@arshad-shah](https://github.com/arshad-shah)! - Fix: per-datum colours from `colorField` / `colorMap` now follow the active theme.

  Categorical values that hashed into the theme palette were baked into `dataset.colors[]` (or, for Pie / Funnel / Treemap, into private `_itemColors`) at `setData` time using the _current_ theme. Subsequent calls to `setTheme()` or `update({ theme })` swapped backgrounds, axes, and grid lines — but the bars, slices, and tiles kept the old palette indefinitely.

  `BaseChart` now exposes a protected `_rebakeColorsForTheme()` hook that re-resolves `colorField` against the new palette without re-animating. The hook is called on both theme-change paths and is overridden by Pie, Funnel, and Treemap to redo their own per-datum bake. Charts without a `colorField` mapping skip the rebake entirely; the pre-built `{ labels, datasets }` shape is also untouched (the consumer owns colours there).

  Explicit `colorMap` entries and verbatim CSS colour strings are still respected — only categorical values that fell through to the palette move.

  Closes [#21](https://github.com/arshad-shah/swiftchart/issues/21).

- [#35](https://github.com/arshad-shah/swiftchart/pull/35) [`ac6abaa`](https://github.com/arshad-shah/swiftchart/commit/ac6abaae126e6bbb9cc7d69356dff48ba9396885) Thanks [@arshad-shah](https://github.com/arshad-shah)! - Documentation: every public export now has JSDoc, and every public field on the cross-chart types has a one-line description.

  The package shipped with thorough docs on the chart-config interfaces but had a handful of top-level exports (`Animator`, `EASINGS`, `EasingFn`, `BaseChart`, `Tooltip`, `TooltipRow`, `TooltipContent`, `RoundedBarOpts`, `THEMES`, `resolveTheme`, `addTheme`, `ChartRef`, perf-layout interfaces, `DrawCommand`, `PathSegment`, `OffscreenRenderResult`) and 50+ public fields (`Padding`, `Dataset`, `ResolvedData`, `PlotArea`, `NiceScale`, `GaugeSegment`, `ScatterPoint`, `WaterfallItem`, `TreemapItem`, `CandlestickItem`, `BoxplotItem`, `FunnelItem`, `SankeyNode`/`Link`, `NetworkNode`/`Link`, `BulletItem`, `TreemapRect`, `SparklineComponentProps`, etc.) that were undocumented.

  All of those now have JSDoc comments — including `@param`, `@example`, and `@see` cross-references where useful — so consumers get hover-help in their IDE and the auto-generated TypeDoc API reference is fully populated. No runtime behaviour changes.

- [#28](https://github.com/arshad-shah/swiftchart/pull/28) [`e05e250`](https://github.com/arshad-shah/swiftchart/commit/e05e250a6b273f668a732047444a363350a314e1) Thanks [@arshad-shah](https://github.com/arshad-shah)! - Fix: React `onPointClick` prop changes are now propagated to the underlying chart after mount.

  Previously, `useChart` excluded `onClick` from its config-diff path (functions don't survive `JSON.stringify`) and the mount-only effect captured the first render's handler into `chart.config.onClick`. Subsequent prop swaps were silently ignored, so any `onPointClick` that closed over component state showed stale values for the chart's lifetime.

  The hook now syncs the latest handler reference into `chart.config.onClick` on every render. The chart's bound click listener already reads `config.onClick` lazily on each click, so no redraw, recreation, or `setData` is triggered — the cost is one assignment per render.

  Closes [#19](https://github.com/arshad-shah/swiftchart/issues/19).

- [#34](https://github.com/arshad-shah/swiftchart/pull/34) [`544e3ae`](https://github.com/arshad-shah/swiftchart/commit/544e3ae5202b03f6c5e846eaf213cb1fec293df4) Thanks [@arshad-shah](https://github.com/arshad-shah)! - Theme system robustness: dev warnings + safe fallbacks for the four most common theme misuses.

  In development builds (`process.env.NODE_ENV !== 'production'`), the theme resolver now surfaces three classes of misuse via `console.warn`:

  - **Unknown theme name.** `theme: 'rd-light'` when no `addTheme('rd-light', …)` has run used to fall through silently to `midnight`. It still falls back, but now logs `[SwiftChart] Theme "rd-light" is not registered — falling back to "midnight". Available themes: …` so the misnaming is visible.
  - **`addTheme` with missing required fields.** `addTheme('brand', { bg: '#fff' })` left `surface`/`grid`/`text`/`textMuted`/`axis`/`colors` as `undefined`. Subsequent `ctx.fillStyle = undefined` was silently rejected by the canvas (the previous fillStyle was reused), producing baffling renders. Missing fields are now **backfilled from midnight** so production never ships with `undefined` colours, and the dev warning lists which fields were filled in.
  - **`addTheme` shadowing a built-in name** (`midnight`, `arctic`, `ember`, `forest`). The override still applies — this is intentional flexibility — but a warning fires so accidental overrides aren't silent.

  Production builds drop the warnings entirely.

  Also tightens `Tooltip`'s inline-color sanitiser: the previous `/^[a-zA-Z]+$/` regex let typos like `'foobar'` through (browsers then silently rejected the invalid background). The check now uses `CSS.supports('color', candidate)` when available, with a tighter explicit-prefix fallback for environments that don't expose `CSS.supports`.

  Adds 11 regression tests and a "Diagnostics" section to the Theming guide.

  Closes [#24](https://github.com/arshad-shah/swiftchart/issues/24).

- [#29](https://github.com/arshad-shah/swiftchart/pull/29) [`762cb64`](https://github.com/arshad-shah/swiftchart/commit/762cb642509a9cd5f0f1ddc6a8444d0dec998fa7) Thanks [@arshad-shah](https://github.com/arshad-shah)! - Fix: a finger tap on a chart now fires `onClick` / `onPointClick` on touch devices.

  The chart was resetting `hoverIndex` to `-1` in its `touchend` handler before the browser dispatched the synthetic `click` that follows a tap. The click handler's guard (`hoverIndex >= 0`) therefore always failed and the user's handler never ran. Mouse clicks on desktop were unaffected.

  `touchend` now snapshots the touched index, and the click handler consumes it within a 700 ms window. The snapshot is one-shot (cleared after consumption) and `touchcancel` discards it so an interrupted gesture can't replay as a click later.

  Closes [#20](https://github.com/arshad-shah/swiftchart/issues/20).

## 1.2.1

### Patch Changes

- fix: clamp computed canvas-arc radii in bubble, network, radial-bar, and gauge so animation overshoot or near-zero plot areas can no longer throw `IndexSizeError: The radius provided … is negative` from `CanvasRenderingContext2D.arc`. The radial-bar `drawInner` formula (`rOuter - (rOuter - rInner) * norm * t`) can briefly produce a tiny negative under easing curves that overshoot 1; bubble's `r * t` and network's per-node radius had the same shape. Every computed-radius arc call is now wrapped in `safeRadius`.

## 1.2.0

### Minor Changes

- [#16](https://github.com/arshad-shah/swiftchart/pull/16) [`feded33`](https://github.com/arshad-shah/swiftchart/commit/feded33b643c760be409e3553a2fe789571b6991) Thanks [@arshad-shah](https://github.com/arshad-shah)! - feat: rich click events for drill-down / user-journey integrations.

  `onClick` (and the React `onPointClick` prop) now receives a third argument: a `ChartClickEvent` carrying the original row (`datum`), the resolved series, the numeric value, the categorical label, the series index, and the underlying `MouseEvent`. The two-argument signature still works — the event is additive.

  ```ts
  // Drill-down: navigate using the original row that was clicked
  onClick: (_i, _d, e) => {
    router.push(`/orders/${e.datum.id}`);
  };

  // Modifier-key behaviour
  onClick: (_i, _d, e) => {
    if (e.nativeEvent.metaKey) window.open(linkFor(e.datum), "_blank");
  };
  ```

  Bubble, scatter, heatmap, and marimekko build a chart-shape-aware event so the payload reflects the actual point/cell clicked rather than the slot index. Series-aware charts (bubble, scatter, heatmap) populate `event.seriesIndex`; column-hover charts (line, area, multi-series bar) report `seriesIndex: -1` to signal a non-series-specific click.

## 1.1.1

### Patch Changes

- docs: README accuracy pass for v1.1.0 — replace placeholder/inaccurate content with factual data, address review feedback, and add badges to the header.

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
