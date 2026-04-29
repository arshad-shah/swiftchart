// ═══════════════════════════════════════════════════════
// SwiftChart - Type Definitions
// ═══════════════════════════════════════════════════════

/**
 * A complete colour palette for the chart surface.
 *
 * Pass a `Theme` object directly to any chart's `theme` config field,
 * or register one by name with `addTheme(name, theme)` and reference
 * it as a string.
 *
 * @example
 * ```ts
 * import { addTheme, LineChart } from '@arshad-shah/swift-chart';
 *
 * addTheme('neon', {
 *   bg: '#0a0a0f',
 *   surface: '#111118',
 *   grid: '#ffffff10',
 *   text: '#e0e0ff',
 *   textMuted: '#6060a0',
 *   axis: '#2a2a4a',
 *   positive: '#4ade80',
 *   negative: '#ef4444',
 *   onAccent: '#0a0a0f',
 *   colors: ['#ff00ff', '#00ffff', '#ffff00'],
 * });
 *
 * new LineChart('#chart', { theme: 'neon' });
 * ```
 */
export interface Theme {
  /** Page background. Used to fill the canvas before drawing. */
  bg: string;
  /** Card surface drawn behind the plot area. */
  surface: string;
  /** Grid line stroke colour. Use a translucent value. */
  grid: string;
  /** Primary text colour for titles, labels, tick numbers. */
  text: string;
  /** Secondary text for muted axis labels and dimmed legend entries. */
  textMuted: string;
  /** Axis stroke colour. */
  axis: string;
  /** Semantic colour for "good"/"up" values (waterfall, deltas). */
  positive: string;
  /** Semantic colour for "bad"/"down" values. */
  negative: string;
  /** Foreground for text drawn on top of accent fills (e.g. labels inside bars). */
  onAccent: string;
  /** Series palette. Indexed modulo length for charts with more series than colours. */
  colors: string[];
}

/**
 * Built-in theme name. Pass any string for a custom-registered theme.
 *
 * Built-ins: `'midnight'` (default dark), `'arctic'` (light cool),
 * `'ember'` (warm dark), `'forest'` (green dark).
 */
export type ThemeName = 'midnight' | 'arctic' | 'ember' | 'forest' | (string & {});

/**
 * Easing curve name for entry animations.
 *
 * - `linear` - uniform speed
 * - `easeOutCubic` - gentle deceleration (default)
 * - `easeInOutQuart` - slow start and end
 * - `easeOutBack` - slight overshoot
 * - `easeOutElastic` - playful bounce
 */
export type EasingName =
  | 'linear'
  | 'easeOutCubic'
  | 'easeOutElastic'
  | 'easeInOutQuart'
  | 'easeOutBack';

/** Pixel padding around the plot area inside the canvas. */
export interface Padding {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

/** Where the legend renders relative to the plot area. */
export type LegendPosition = 'top' | 'bottom' | 'left' | 'right' | 'none';

/**
 * A single named series of numeric values.
 *
 * `data.length` must equal `labels.length` of the parent {@link ResolvedData}.
 */
export interface Dataset {
  label: string;
  data: number[];
  /** Override the auto-assigned series colour. */
  color?: string;
}

/**
 * Internal "ready to render" data shape. The result of resolving raw user
 * input (any object array) against the {@link DataMapping}.
 */
export interface ResolvedData {
  labels: string[];
  datasets: Dataset[];
}

/**
 * Tells SwiftChart how to read your data.
 *
 * SwiftChart accepts any object array. Use `DataMapping` to pick which
 * field is the X axis and which is the Y axis, or to pass pre-built
 * `{ labels, datasets }` directly.
 *
 * @example Auto-detect (no mapping needed)
 * ```ts
 * chart.setData([
 *   { month: 'Jan', sales: 420, cost: 280 },
 *   { month: 'Feb', sales: 510, cost: 320 },
 * ]);
 * // First string field becomes labels, all numeric fields become series.
 * ```
 *
 * @example Explicit mapping with multi-series
 * ```ts
 * chart.setData(rows, {
 *   x: 'timestamp',
 *   y: ['cpu', 'memory'],
 *   seriesNames: ['CPU %', 'Memory %'],
 * });
 * ```
 *
 * @example Pie / Donut / Treemap
 * ```ts
 * chart.setData(rows, { labelField: 'source', valueField: 'visits' });
 * ```
 *
 * @example Pre-built shape (Chart.js-compatible)
 * ```ts
 * chart.setData([], {
 *   labels: ['Q1', 'Q2', 'Q3'],
 *   datasets: [{ label: 'Revenue', data: [100, 200, 350] }],
 * });
 * ```
 */
export interface DataMapping {
  /** Field whose value becomes the X-axis label (categorical) for line/bar/area/radar/stacked. */
  x?: string;
  /** Alias for `x` used by pie/donut/treemap to read the slice label. */
  labelField?: string;
  /** Single field name or array of field names to plot as Y-axis series. */
  y?: string | string[];
  /** Alias for `y` used by pie/donut/treemap to read the slice value. */
  valueField?: string;
  /** Override the auto-derived series labels (one per `y` field). */
  seriesNames?: string[];
  /** Pre-built labels - used when bypassing field-mapping. */
  labels?: string[];
  /** Pre-built numeric values - used by pie/donut when bypassing field-mapping. */
  values?: number[];
  /** Pre-built datasets - Chart.js-style escape hatch. */
  datasets?: Dataset[];
  /** Scatter-only: field whose value sets each point's radius. */
  sizeField?: string;
  /** Scatter-only: field whose value groups points (drives colour assignment). */
  groupField?: string;
}

/**
 * Options shared by every chart type.
 *
 * @example
 * ```ts
 * new BarChart('#chart', {
 *   theme: 'arctic',
 *   title: 'Quarterly revenue',
 *   subtitle: 'In thousands USD',
 *   formatValue: (v) => `$${v}k`,
 *   onClick: (i, data) => console.log('clicked', data.labels[i]),
 *   animDuration: 800,
 *   ariaLabel: 'Quarterly revenue bar chart',
 * });
 * ```
 */
export interface BaseChartConfig {
  /** Theme name (`'midnight'` etc.) or a complete {@link Theme} object. */
  theme?: ThemeName | Theme;
  /** Run an entry animation on the first render and on data updates. Default `true`. */
  animate?: boolean;
  /** Animation duration in milliseconds. Default `600`. */
  animDuration?: number;
  /** Easing curve. Default `'easeOutCubic'`. */
  animEasing?: EasingName;
  /** Auto-resize when the container size changes via `ResizeObserver`. Default `true`. */
  responsive?: boolean;
  /** Override the auto-computed plot area padding (pixels). */
  padding?: Partial<Padding>;
  /** Show grid lines on the plot area. Default `true`. */
  showGrid?: boolean;
  /** Render an interactive tooltip on hover. Default `true`. */
  showTooltip?: boolean;
  /** Render a legend listing each series. Default `true`. */
  showLegend?: boolean;
  /** Where the legend appears relative to the plot. Default `'top'`. */
  legendPosition?: LegendPosition;
  /** Chart heading rendered above the plot. */
  title?: string;
  /** Sub-heading rendered under the title. */
  subtitle?: string;
  /**
   * Format a numeric value for axis ticks, tooltips, and labels.
   *
   * @example
   * ```ts
   * formatValue: (v) => v >= 1000 ? `${(v/1000).toFixed(1)}k` : `${v}`
   * ```
   */
  formatValue?: (value: number) => string;
  /**
   * Click handler invoked with the index of the clicked data point and the
   * resolved data shape so consumers can read the underlying row.
   */
  onClick?: (index: number, data: ResolvedData) => void;
  /** Accessible label for screen readers (rendered as canvas `aria-label`). */
  ariaLabel?: string;
  /** Longer accessible description (rendered as canvas `aria-description`). */
  ariaDescription?: string;
}

/**
 * Line / Area chart configuration.
 *
 * @example
 * ```ts
 * new LineChart('#chart', { theme: 'midnight', area: true, smooth: true, dots: true });
 * ```
 */
export interface LineChartConfig extends BaseChartConfig {
  /** Fill the area under the line with a soft gradient. */
  area?: boolean;
  /** Use cubic Bézier interpolation between points instead of straight segments. */
  smooth?: boolean;
  /** Render a dot at each data point. */
  dots?: boolean;
  /** Stroke width in pixels. Default `2`. */
  lineWidth?: number;
}

/**
 * Pie / Donut chart configuration.
 *
 * @example
 * ```ts
 * new PieChart('#chart', { donut: true, donutWidth: 0.55 });
 * ```
 */
export interface PieChartConfig extends BaseChartConfig {
  /** Render as a donut (centre cutout). */
  donut?: boolean;
  /** Cutout ratio (0–1). Lower values produce a thicker ring. Default `0.6`. */
  donutWidth?: number;
}

/**
 * Gauge / meter configuration.
 *
 * @example
 * ```ts
 * new GaugeChart('#chart', {
 *   min: 0, max: 100,
 *   segments: [
 *     { from: 0,  to: 60,  color: '#5b8cff' },
 *     { from: 60, to: 85,  color: '#ffa45b' },
 *     { from: 85, to: 100, color: '#ff5b5b' },
 *   ],
 * });
 * chart.setData([72]);
 * ```
 */
export interface GaugeConfig extends BaseChartConfig {
  /** Minimum scale value. Default `0`. */
  min?: number;
  /** Maximum scale value. Default `100`. */
  max?: number;
  /** Current value (alternative to `setData([value])`). */
  value?: number;
  /** Coloured threshold ranges painted around the arc. */
  segments?: GaugeSegment[];
}

/** A single coloured range on a gauge. */
export interface GaugeSegment {
  color: string;
  /** End of the segment, in the gauge's [min, max] domain. */
  to: number;
}

/** Scatter point in cartesian space. */
export interface ScatterPoint {
  x: number;
  y: number;
  /** Optional label shown in the tooltip. */
  label?: string;
  /** Optional radius. Falls back to a constant if omitted. */
  size?: number;
}

/** Scatter data grouped by category - one colour per group. */
export interface ScatterGroups {
  [group: string]: ScatterPoint[];
}

/** A single bar in a waterfall - positive adds, negative subtracts. */
export interface WaterfallItem {
  label: string;
  value: number;
}

/** A single rectangle in a treemap. */
export interface TreemapItem {
  label: string;
  value: number;
}

/** A treemap rect with computed pixel coordinates (internal use). */
export interface TreemapRect extends TreemapItem {
  rx: number;
  ry: number;
  rw: number;
  rh: number;
}

/** Pixel-space rectangle covering the chart's drawing area. */
export interface PlotArea {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Result of {@link niceScale} - rounded axis bounds and tick step. */
export interface NiceScale {
  min: number;
  max: number;
  step: number;
}

/**
 * Builds tooltip HTML for the hovered data point.
 *
 * @param index Index of the hovered point (0-based).
 * @param data Resolved data shape with labels + datasets.
 * @param theme Active theme - useful for matching tooltip colours to series.
 */
export type TooltipFormatter = (
  index: number,
  data: ResolvedData,
  theme: Theme
) => string;

// ── React Component Props ──────────────────────────────

/**
 * Common props accepted by every React chart component.
 *
 * @example
 * ```tsx
 * <Line
 *   data={rows}
 *   mapping={{ x: 'month', y: ['revenue', 'target'] }}
 *   width="100%"
 *   height={320}
 *   onPointClick={(i, data) => console.log(data.labels[i])}
 * />
 * ```
 */
export interface ChartComponentProps {
  /** Raw data array. Any shape - combined with `mapping` to derive series. */
  data?: Record<string, any>[];
  /** Tells the chart which fields to plot. See {@link DataMapping}. */
  mapping?: DataMapping;
  /** CSS width on the wrapper div. Numbers are interpreted as pixels. */
  width?: string | number;
  /** CSS height on the wrapper div. Numbers are interpreted as pixels. */
  height?: string | number;
  /** Class name on the wrapper div. */
  className?: string;
  /** Inline styles on the wrapper div. */
  style?: React.CSSProperties;
  /** Click handler - receives the clicked data point's index. */
  onPointClick?: (index: number, data: ResolvedData) => void;
}

/** Props for the React `<Line>` and `<Area>` components. */
export interface LineComponentProps extends ChartComponentProps, LineChartConfig {}
/** Props for the React `<Bar>` component. */
export interface BarComponentProps extends ChartComponentProps, BaseChartConfig {}
/** Props for the React `<Pie>` and `<Donut>` components. */
export interface PieComponentProps extends ChartComponentProps, PieChartConfig {}
/** Props for the React `<Scatter>` component. */
export interface ScatterComponentProps extends ChartComponentProps, BaseChartConfig {}
/** Props for the React `<Radar>` component. */
export interface RadarComponentProps extends ChartComponentProps, BaseChartConfig {}
/** Props for the React `<Gauge>` component. */
export interface GaugeComponentProps extends ChartComponentProps, GaugeConfig {}
/** Props for the React `<HBar>` component. */
export interface HBarComponentProps extends ChartComponentProps, BaseChartConfig {}

/**
 * Props for the React `<SparklineComponent>` - a minimal, axis-less inline chart.
 *
 * @example
 * ```tsx
 * <SparklineComponent data={[12, 14, 13, 18, 22]} color="#5b8cff" filled height={32} />
 * ```
 */
export interface SparklineComponentProps {
  /** Numeric series. */
  data?: number[];
  /** Stroke colour. Falls back to the theme accent. */
  color?: string;
  /** Fill the area below the line. */
  filled?: boolean;
  /** Animate on first render. Default `true`. */
  animate?: boolean;
  /** Animation duration in ms. Default `600`. */
  animDuration?: number;
  width?: string | number;
  height?: string | number;
  className?: string;
  style?: React.CSSProperties;
  /** Theme name or {@link Theme} object. */
  theme?: ThemeName | Theme;
}
/** Props for the React `<StackedArea>` component. */
export interface StackedAreaComponentProps extends ChartComponentProps, BaseChartConfig {}
/** Props for the React `<Waterfall>` component. */
export interface WaterfallComponentProps extends ChartComponentProps, BaseChartConfig {}
/** Props for the React `<Treemap>` component. */
export interface TreemapComponentProps extends ChartComponentProps, BaseChartConfig {}
