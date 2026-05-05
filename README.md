# SwiftChart

**Lightning-fast, zero-dependency Canvas 2D charting library with first-class React bindings. 25 chart types, tree-shakeable, schema-agnostic, animated.**

```
npm install @arshad-shah/swift-chart
```

## Why SwiftChart?

| | SwiftChart | Highcharts | Chart.js | Recharts |
|---|---|---|---|---|
| **Bundle** | 6–20 KB brotli¹ | ~80KB | ~60KB | ~45KB |
| **Dependencies** | 0 | 0 | 0 | 6+ |
| **Renderer** | Canvas 2D | SVG/Canvas | Canvas | SVG |
| **React** | Built-in | Wrapper | Wrapper | Native |
| **Schema** | Any shape | Fixed | Fixed | Fixed |
| **License** | MIT (free) | Commercial | MIT | MIT |
| **Themes** | 4 built-in + custom | Paid | Manual | Manual |
| **Chart types** | 25 | 50+ | 8 | 15 |

¹ Tree-shaken: single chart ~6 KB, full bundle ~20 KB (brotli).

## Quick Start

### Vanilla JS

```js
import { LineChart } from '@arshad-shah/swift-chart';

const chart = new LineChart('#my-chart', {
  title: 'Revenue',
  theme: 'midnight',
  area: true,
});

// Pass ANY data shape - SwiftChart auto-detects fields
chart.setData(apiResponse, {
  x: 'date',
  y: 'revenue',
});
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

## Chart Types

| Type | Import (Vanilla) | Import (React) | Description |
|---|---|---|---|
| Line | `LineChart` | `Line` | Smooth/straight/step lines with optional dots |
| Area | `LineChart` (area: true) | `Area` | Line with gradient fill |
| Bar | `BarChart` | `Bar` | Vertical bars, grouped multi-series |
| Horizontal Bar | `HBarChart` | `HBar` | Horizontal bars with labels |
| Stacked Bar | `StackedBarChart` | `StackedBar` | Vertical stack; `percent` for 100%-stacked |
| Pie | `PieChart` | `Pie` | Classic pie chart |
| Donut | `PieChart` (donut: true) | `Donut` | Pie with center cutout |
| Scatter | `ScatterChart` | `Scatter` | XY scatter with grouping |
| Bubble | `BubbleChart` | `Bubble` | Scatter with third magnitude on radius |
| Radar | `RadarChart` | `Radar` | Spider/radar polygon chart |
| Gauge | `GaugeChart` | `Gauge` | Gauge/meter with segments |
| Sparkline | `Sparkline` | `SparklineComponent` | Inline mini chart |
| Stacked Area | `StackedAreaChart` | `StackedArea` | Stacked filled areas |
| Waterfall | `WaterfallChart` | `Waterfall` | Waterfall with running total |
| Treemap | `TreemapChart` | `Treemap` | Squarified treemap |
| Heatmap | `HeatmapChart` | `Heatmap` | Categorical 2-axis grid with colour scale |
| Candlestick | `CandlestickChart` | `Candlestick` | Financial OHLC with configurable colours |
| Boxplot | `BoxplotChart` | `Boxplot` | Box-and-whisker with Tukey fences |
| Funnel | `FunnelChart` | `Funnel` | Drop-off funnel or pyramid |
| Sankey | `SankeyChart` | `Sankey` | DAG-driven flow diagram |
| Combo | `ComboChart` | `Combo` | Bars with line-series overlay |
| Radial Bar | `RadialBarChart` | `RadialBar` | Polar bar or Coxcomb/rose mode |
| Bullet | `BulletChart` | `Bullet` | Stephen Few KPI bullet chart |
| Marimekko | `MarimekkoChart` | `Marimekko` | Variable-width stacked mosaic |
| Network | `NetworkChart` | `Network` | Force-directed node-link graph |

## Schema-Agnostic Data

SwiftChart eats **any shape of data**:

```js
// Auto-detect: string field → labels, number fields → series
chart.setData([
  { month: 'Jan', sales: 420, cost: 280 },
  { month: 'Feb', sales: 510, cost: 320 },
]);

// Explicit mapping
chart.setData(data, {
  x: 'timestamp',
  y: ['metric_a', 'metric_b'],
  seriesNames: ['CPU', 'Memory'],
});

// Pre-built format
chart.setData([], {
  labels: ['Q1', 'Q2', 'Q3'],
  datasets: [{ label: 'Revenue', data: [100, 200, 350] }],
});
```

## Themes

4 built-in themes + unlimited custom themes:

```js
import { addTheme } from '@arshad-shah/swift-chart';

// Built-in: 'midnight' | 'arctic' | 'ember' | 'forest'
const chart = new LineChart(el, { theme: 'midnight' });

// Custom theme
addTheme('neon', {
  bg: '#0a0a0f',
  surface: '#111118',
  grid: '#ffffff08',
  text: '#e0e0ff',
  textMuted: '#6060a0',
  axis: '#2a2a4a',
  positive: '#4ade80',
  negative: '#ef4444',
  onAccent: '#0a0a0f',
  colors: ['#ff00ff', '#00ffff', '#ffff00', '#ff6600'],
});
```

## React Ref API

Access the underlying chart instance for imperative control:

```tsx
import { Line, type ChartRef } from '@arshad-shah/swift-chart/react';

function MyChart() {
  const ref = useRef<ChartRef>(null);

  return (
    <>
      <Line ref={ref} data={data} mapping={mapping} />
      <button onClick={() => ref.current?.resize()}>Resize</button>
    </>
  );
}
```

## Configuration

All charts accept these base options:

```ts
interface BaseChartConfig {
  theme?: 'midnight' | 'arctic' | 'ember' | 'forest' | Theme;
  animate?: boolean;           // default: true
  animDuration?: number;       // default: 600ms
  animEasing?: EasingName;     // default: 'easeOutCubic'
  responsive?: boolean;        // default: true (auto-resize)
  padding?: Partial<Padding>;
  showGrid?: boolean;          // default: true
  showTooltip?: boolean;       // default: true
  showLegend?: boolean;        // default: true
  legendPosition?: 'top' | 'bottom' | 'left' | 'right' | 'none'; // default: 'top'
  title?: string;
  subtitle?: string;
  formatValue?: (v: number) => string;
  colorFn?: (value: number, dataIdx: number, seriesIdx: number) => string | undefined;
  onClick?: (index: number, data: ResolvedData) => void;
  ariaLabel?: string;
  ariaDescription?: string;
}
```

`LineChart` also accepts a `step` option for staircase plots:

```ts
// Mutually exclusive with smooth. Default 'after' when step: true is passed.
step?: boolean | 'before' | 'after' | 'middle';
```

## Browser Support

Canvas 2D + ResizeObserver: Chrome 64+, Firefox 69+, Safari 13.1+, Edge 79+.

## Documentation

Full guides, live previews, and API reference: **https://swiftchart.arshadshah.com**

To run the docs site locally:

```bash
pnpm install
pnpm --filter swiftchart-docs dev
```

## License

MIT © Arshad Shah
