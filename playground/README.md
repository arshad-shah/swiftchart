# SwiftChart Playground

Interactive showcase for every chart type and capability.

```bash
cd playground
pnpm install      # or npm install
pnpm dev          # http://localhost:5173
```

The playground imports `swiftchart` directly from `../src` via a Vite alias,
so editing the library source hot-reloads every chart.

## What's in here

- **Line / Area / Bar / HBar** — basic types with theme + legend toggles.
- **Pie / Donut** — center read-out, hover-to-explode.
- **Scatter** — quadtree-accelerated nearest-point hover with grouped clusters.
- **Radar** — multi-series capability map.
- **Gauge** — live-updating value, animated needle.
- **Waterfall / Treemap** — theme-aware semantic colors.
- **Stacked Area** — running totals in the tooltip.
- **Sparklines** — inline 40-pt mini lines.
- **Big-data demo** — switch 1K → 500K points; LTTB downsamples to fit the
  viewport. Watch the synth time stay flat-ish.
- **Streaming** — `StreamDataset` ring buffer at 5 Hz with rolling window.
- **Imperative ref + PNG export** — `ChartRef.toDataURL()` produces a
  download link.
- **🛡 XSS hardening** — bar chart whose labels are `<script>`,
  `<img onerror>`, etc. Verify in DevTools that they're rendered as text only.

## Customising

The toolbar lets you flip:

- Theme — `midnight | arctic | ember | forest | neon` (the last is registered
  in `App.tsx` via `addTheme()`).
- Animate on/off.
- Legend position — `top | bottom | left | right`.
