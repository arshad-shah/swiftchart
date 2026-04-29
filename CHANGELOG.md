# Changelog

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
