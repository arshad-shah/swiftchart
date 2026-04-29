# Changelog

All notable changes to this project are documented here.
Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), versioning: [SemVer](https://semver.org/).

## [Unreleased]

### Security

- **Tooltip XSS hardening.** All tooltip rendering now goes through DOM
  construction with `textContent` for user-supplied fields. Previously, a
  series label or label string could inject HTML/script into the tooltip.
  The legacy `tooltip.show(text)` is now treated as plain text;
  use `tooltip.showStructured({ title, rows, footer })` for rich content.

### Fixed

- `StreamBuffer.minMax` cache is now correctly invalidated on `push` /
  `pushMany` / `clear` (previously froze after the first call).
- `OffscreenRenderer.executeCommands` now handles the `'path'` draw op
  (previously dropped silently).
- `BarChart` no longer produces an inverted scale when all values are
  negative; the value axis always includes zero.
- `PieChart`, `Treemap`, `Gauge` guard against `total === 0` /
  `min === max` divide-by-zero NaNs.
- `Math.min/max(...largeArray)` call-stack overflow in `LineChart`,
  `ScatterChart`, `RadarChart`, `HBarChart`, `StackedAreaChart`,
  `WaterfallChart`, `Sparkline` — replaced by single-pass `arrayMin`/`arrayMax`
  utilities.
- Line-chart x-labels now align with point indices, not bar slots.
- Grid tick labels iterate by tick count; floating-point drift on long
  ranges no longer produces "11.999999"-style labels.
- React wrapper: `mapping` and `theme` referential instability no longer
  re-runs `setData`/recreates the chart on every parent render.
- `setTheme` is used on theme switch instead of recreating the chart.
- `useChart` now uses `RefObject<T | null>` (React 19 compatible) instead
  of the deprecated `MutableRefObject`.
- SSR: throws a clear error when constructed in a server context;
  React components now declare `'use client'`.

### Added

- `Theme.positive`, `Theme.negative`, `Theme.onAccent` semantic colors —
  HBar/Waterfall/Treemap/StackedArea no longer hard-code white/green/red.
- `BaseChartConfig.ariaLabel` and `ariaDescription` — canvas now sets
  `role="img"` and `tabIndex` so screen readers can pick up the chart.
- `BaseChart.update(patch)` — change theme, title, padding, easing,
  duration, ariaLabel at runtime without re-creation.
- `BaseChart.toDataURL()` — export a chart as PNG.
- `ChartRef.toDataURL()` — same for React components.
- Touch support: `touchstart`/`touchmove`/`touchend` synthesise mouse
  events for tooltip/hover on mobile.
- `legendPosition: 'left' | 'right' | 'bottom'` are now actually
  laid out (previously only `'top'` was wired up).
- `hexToRgba` accepts `#RGB`, `#RRGGBB`, `#RRGGBBAA`, `rgb()`, `rgba()`.
- `escapeHtml`, `arrayMin`, `arrayMax`, `arraysExtent` utilities.
- `Tooltip.showStructured(x, y, content)` — safe-by-default rich tooltip API.
- ESLint flat config, `publint`, `arethetypeswrong`, `size-limit`
  validation in CI.
- GitHub Actions CI workflow.
- Playground app under `/playground`.

### Changed

- `package.json` — added `./package.json` to exports map; added
  `peerDependenciesMeta` for `@types/react`; bumped engine matrix to
  `^18.18 || ^20 || >=22`.

## [1.0.0] — Initial release

- LineChart, BarChart, PieChart, ScatterChart, RadarChart, GaugeChart,
  HBarChart, Sparkline, StackedAreaChart, WaterfallChart, TreemapChart.
- React wrappers under `@arshad-shah/swift-chart/react`.
- LTTB downsampling, Quadtree hover, viewport culling, OffscreenCanvas
  composite, StreamBuffer ring buffer.
- Themes: midnight, arctic, ember, forest.
