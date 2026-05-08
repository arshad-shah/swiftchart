# SwiftChart

**Lightning-fast, zero-dependency Canvas 2D charting library with first-class React bindings. 25 chart types, tree-shakeable, schema-agnostic, animated.**

[![CI](https://github.com/arshad-shah/swiftchart/actions/workflows/ci.yml/badge.svg)](https://github.com/arshad-shah/swiftchart/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/@arshad-shah/swift-chart?color=cb3837&logo=npm&logoColor=white)](https://www.npmjs.com/package/@arshad-shah/swift-chart)
[![npm downloads](https://img.shields.io/npm/dm/@arshad-shah/swift-chart?logo=npm&logoColor=white)](https://www.npmjs.com/package/@arshad-shah/swift-chart)
[![Bundle size](https://img.shields.io/bundlephobia/minzip/@arshad-shah/swift-chart?label=minzipped&color=4ade80)](https://bundlephobia.com/package/@arshad-shah/swift-chart)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7+-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

📖 **[Full documentation, live previews, and API reference →](https://swiftchart.arshadshah.com)**

```bash
npm install @arshad-shah/swift-chart
```

## Why SwiftChart?

<table>
  <thead>
    <tr>
      <th align="left">&nbsp;</th>
      <th align="left">SwiftChart</th>
      <th align="left">Highcharts</th>
      <th align="left">Chart.js</th>
      <th align="left">Recharts</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><b>Bundle</b> (min+gzip)</td>
      <td>~26&nbsp;KB</td>
      <td>~32&nbsp;KB</td>
      <td>~19&nbsp;KB</td>
      <td>~95&nbsp;KB</td>
    </tr>
    <tr>
      <td><b>Chart types</b></td>
      <td>25</td>
      <td>40+</td>
      <td>8</td>
      <td>14</td>
    </tr>
    <tr>
      <td><b>Runtime deps</b></td>
      <td>0</td>
      <td>0</td>
      <td>0</td>
      <td>10+ (d3)</td>
    </tr>
    <tr>
      <td><b>Renderer</b></td>
      <td>Canvas&nbsp;2D</td>
      <td>SVG&nbsp;/&nbsp;Canvas</td>
      <td>Canvas</td>
      <td>SVG</td>
    </tr>
    <tr>
      <td><b>React bindings</b></td>
      <td>First-class</td>
      <td>3rd-party</td>
      <td>3rd-party</td>
      <td>Native</td>
    </tr>
    <tr>
      <td><b>Data shape</b></td>
      <td>Any</td>
      <td>Fixed</td>
      <td>Fixed</td>
      <td>Fixed</td>
    </tr>
    <tr>
      <td><b>License</b></td>
      <td>MIT</td>
      <td>Commercial</td>
      <td>MIT</td>
      <td>MIT</td>
    </tr>
  </tbody>
</table>

<sub>SwiftChart bundle size is measured from <code>dist/esm/index.js</code> at the current commit. Other libraries' figures are approximate min+gzip values from <a href="https://bundlephobia.com">bundlephobia</a> for their current major versions.</sub>

## Quick start

### Vanilla JS

```js
import { LineChart } from '@arshad-shah/swift-chart';

const chart = new LineChart('#my-chart', {
  title: 'Revenue',
  theme: 'midnight',
  area: true,
});

// Pass any data shape — SwiftChart auto-detects fields.
chart.setData(apiResponse, { x: 'date', y: 'revenue' });
```

### React

```tsx
import { Line, Bar, Donut } from '@arshad-shah/swift-chart/react';

function Dashboard() {
  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <Line
        data={salesData}
        mapping={{ x: 'month', y: ['revenue', 'target'] }}
        theme="midnight"
        height={300}
        area
      />
      <Bar
        data={regionData}
        mapping={{ x: 'region', y: 'sales' }}
        theme="arctic"
        height={300}
      />
      <Donut
        data={trafficData}
        mapping={{ labelField: 'source', valueField: 'visits' }}
        height={300}
      />
    </div>
  );
}
```

## Chart types

25 chart types, grouped by family. Every entry is exported from both the vanilla entry (`@arshad-shah/swift-chart`) and the React entry (`@arshad-shah/swift-chart/react`).

<table>
  <thead><tr><th align="left">Family</th><th align="left">Charts</th></tr></thead>
  <tbody>
    <tr>
      <td><b>Cartesian</b></td>
      <td>
        <code>Line</code> · <code>Area</code> · <code>Bar</code> · <code>HBar</code> ·
        <code>StackedBar</code> · <code>StackedArea</code> · <code>Combo</code> ·
        <code>Waterfall</code>
      </td>
    </tr>
    <tr>
      <td><b>Distribution</b></td>
      <td><code>Scatter</code> · <code>Bubble</code> · <code>Boxplot</code> · <code>Heatmap</code></td>
    </tr>
    <tr>
      <td><b>Part-of-whole</b></td>
      <td>
        <code>Pie</code> · <code>Donut</code> · <code>Treemap</code> · <code>Funnel</code> ·
        <code>Marimekko</code>
      </td>
    </tr>
    <tr>
      <td><b>Polar</b></td>
      <td><code>Radar</code> · <code>Gauge</code> · <code>RadialBar</code> · <code>Bullet</code></td>
    </tr>
    <tr>
      <td><b>Financial</b></td>
      <td><code>Candlestick</code></td>
    </tr>
    <tr>
      <td><b>Graph</b></td>
      <td><code>Sankey</code> · <code>Network</code></td>
    </tr>
    <tr>
      <td><b>Inline</b></td>
      <td><code>Sparkline</code></td>
    </tr>
  </tbody>
</table>

Each chart has its own **[catalogue page](https://swiftchart.arshadshah.com/charts/line/)** with a live preview, full prop list, and code samples for both vanilla and React.

## Schema-agnostic data

SwiftChart eats any shape of data:

```js
// 1. Auto-detect: string field → labels, number fields → series.
chart.setData([
  { month: 'Jan', sales: 420, cost: 280 },
  { month: 'Feb', sales: 510, cost: 320 },
]);

// 2. Explicit mapping.
chart.setData(data, {
  x: 'timestamp',
  y: ['metric_a', 'metric_b'],
  seriesNames: ['CPU', 'Memory'],
});

// 3. Pre-built format (Chart.js-compatible).
chart.setData([], {
  labels: ['Q1', 'Q2', 'Q3'],
  datasets: [{ label: 'Revenue', data: [100, 200, 350] }],
});
```

See **[Data mapping →](https://swiftchart.arshadshah.com/guides/data-mapping/)** for the full resolver, including `colorField` / `colorMap` for per-datum colours.

## Themes

4 built-in themes plus unlimited custom themes:

```js
import { addTheme, LineChart } from '@arshad-shah/swift-chart';

// Built-in: 'midnight' | 'arctic' | 'ember' | 'forest'
new LineChart(el, { theme: 'midnight' });

// Custom theme
addTheme('neon', {
  bg: '#0a0a0f',
  surface: '#111118',
  grid: '#ffffff08',
  text: '#e0e0ff',
  textMuted: '#6060a0',
  axis: '#2a2a4a',
  colors: ['#ff00ff', '#00ffff', '#ffff00', '#ff6600'],
});
```

`addTheme` is also re-exported from `@arshad-shah/swift-chart/react` so React-only consumers can register without importing the core entry.

Tooltip colours derive from the active theme automatically (light themes get a light tooltip). See **[Theming →](https://swiftchart.arshadshah.com/guides/theming/)**.

## React refs and imperative control

```tsx
import { useRef } from 'react';
import { Line, type ChartRef } from '@arshad-shah/swift-chart/react';

function MyChart() {
  const ref = useRef<ChartRef>(null);
  return (
    <>
      <Line ref={ref} data={data} mapping={mapping} />
      <button onClick={() => ref.current?.resize()}>Resize</button>
      <button onClick={() => download(ref.current?.toDataURL())}>Save PNG</button>
    </>
  );
}
```

## Click events / drill-down

Every chart's `onClick` (and the React `onPointClick` prop) receives a `ChartClickEvent` carrying the original row, the resolved series, the value, and the underlying `MouseEvent`:

```tsx
<Bar
  data={orders}
  mapping={{ x: 'region', y: 'revenue' }}
  onPointClick={(_i, _d, e) => {
    // e.datum   → original row from `orders`
    // e.label   → 'NA' | 'EU' | …
    // e.value   → numeric revenue
    // e.nativeEvent.metaKey → ⌘ for "open in new tab" etc.
    router.push(`/regions/${e.datum.id}`);
  }}
/>
```

Tap-to-click on touch devices and Enter/Space/Arrow-key activation on focused interactive charts both fire the same handler — see **[Click events →](https://swiftchart.arshadshah.com/guides/click-events/)** and **[Accessibility →](https://swiftchart.arshadshah.com/guides/accessibility/)**.

## Configuration

All charts accept these base options (chart-specific options are documented in each [catalogue page](https://swiftchart.arshadshah.com/charts/line/)):

```ts
interface BaseChartConfig {
  theme?: 'midnight' | 'arctic' | 'ember' | 'forest' | Theme;
  animate?: boolean;           // default true (auto-disabled when prefers-reduced-motion is set)
  animDuration?: number;       // default 600ms
  animEasing?: EasingName;     // default 'easeOutCubic'
  responsive?: boolean;        // default true (auto-resize via ResizeObserver)
  padding?: Partial<Padding>;
  showGrid?: boolean;          // default true
  showTooltip?: boolean;       // default true
  showLegend?: boolean;        // default true
  legendPosition?: 'top' | 'bottom' | 'left' | 'right' | 'none'; // default 'top'
  title?: string;
  subtitle?: string;
  formatValue?: (v: number) => string;
  colorFn?: (value: number, dataIdx: number, seriesIdx: number) => string | undefined;
  onClick?: (index: number, data: ResolvedData, event: ChartClickEvent) => void;
  ariaLabel?: string;
  ariaDescription?: string;
  tooltipContainer?: HTMLElement; // portal target — defaults to chart container / shadow root
}
```

## Browser support

Canvas 2D + ResizeObserver: Chrome 64+, Firefox 69+, Safari 13.1+, Edge 79+.

Charts work inside **Shadow DOM** (web components), **modals/popovers** (the tooltip stays in the chart's stacking context), and behind **`overflow:auto`** scroll containers (scroll on any ancestor hides the tooltip cleanly).

## Local development

```bash
pnpm install
pnpm test           # run the test suite (1000+ tests)
pnpm validate       # full CI chain: typecheck + lint + test + build + publint + attw + size
pnpm --filter swiftchart-docs dev   # run the docs site locally
```

## License

MIT © Arshad Shah
