// ═══════════════════════════════════════════════════════
// SwiftChart — Type Definitions
// ═══════════════════════════════════════════════════════

/** A single colour palette & surface theme */
export interface Theme {
  bg: string;
  surface: string;
  grid: string;
  text: string;
  textMuted: string;
  axis: string;
  /** Semantic colour for "good"/"up" values (waterfall, deltas). */
  positive: string;
  /** Semantic colour for "bad"/"down" values. */
  negative: string;
  /** Foreground for text drawn on top of accent fills (e.g. labels inside bars). */
  onAccent: string;
  colors: string[];
}

/** Built-in theme names */
export type ThemeName = 'midnight' | 'arctic' | 'ember' | 'forest' | (string & {});

/** Easing function names */
export type EasingName =
  | 'linear'
  | 'easeOutCubic'
  | 'easeOutElastic'
  | 'easeInOutQuart'
  | 'easeOutBack';

/** Padding specification */
export interface Padding {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

/** Legend position */
export type LegendPosition = 'top' | 'bottom' | 'left' | 'right' | 'none';

/** A single data series */
export interface Dataset {
  label: string;
  data: number[];
  color?: string;
}

/** Resolved data ready for rendering */
export interface ResolvedData {
  labels: string[];
  datasets: Dataset[];
}

/** Field mapping for schema-agnostic data ingestion */
export interface DataMapping {
  /** Field to use as x-axis / label */
  x?: string;
  /** Field name for label (alias for x) */
  labelField?: string;
  /** Field(s) to use as y-axis values */
  y?: string | string[];
  /** Field name for value (for pie/donut/treemap) */
  valueField?: string;
  /** Custom names for each series */
  seriesNames?: string[];
  /** Pre-built labels array */
  labels?: string[];
  /** Pre-built values array (for pie/donut) */
  values?: number[];
  /** Pre-built datasets array */
  datasets?: Dataset[];
  /** For scatter: size field */
  sizeField?: string;
  /** For scatter: group field */
  groupField?: string;
}

/** Base chart configuration */
export interface BaseChartConfig {
  /** Theme name or custom theme object */
  theme?: ThemeName | Theme;
  /** Enable entry animation */
  animate?: boolean;
  /** Animation duration in ms */
  animDuration?: number;
  /** Animation easing function */
  animEasing?: EasingName;
  /** Auto-resize on container change */
  responsive?: boolean;
  /** Chart padding */
  padding?: Partial<Padding>;
  /** Show grid lines */
  showGrid?: boolean;
  /** Show interactive tooltips */
  showTooltip?: boolean;
  /** Show legend */
  showLegend?: boolean;
  /** Legend placement */
  legendPosition?: LegendPosition;
  /** Chart title */
  title?: string;
  /** Chart subtitle */
  subtitle?: string;
  /** Custom value formatter */
  formatValue?: (value: number) => string;
  /** Click handler */
  onClick?: (index: number, data: ResolvedData) => void;
  /** Accessible label for screen readers (rendered as canvas aria-label). */
  ariaLabel?: string;
  /** Longer accessible description (rendered as canvas aria-description). */
  ariaDescription?: string;
}

/** Line / Area chart config */
export interface LineChartConfig extends BaseChartConfig {
  /** Fill area under the line */
  area?: boolean;
  /** Use bezier smoothing */
  smooth?: boolean;
  /** Show data point dots */
  dots?: boolean;
  /** Line stroke width */
  lineWidth?: number;
}

/** Pie / Donut chart config */
export interface PieChartConfig extends BaseChartConfig {
  /** Render as donut */
  donut?: boolean;
  /** Inner radius ratio (0-1) for donut */
  donutWidth?: number;
}

/** Gauge chart config */
export interface GaugeConfig extends BaseChartConfig {
  /** Minimum value */
  min?: number;
  /** Maximum value */
  max?: number;
  /** Current value */
  value?: number;
  /** Coloured segments */
  segments?: GaugeSegment[];
}

export interface GaugeSegment {
  color: string;
  to: number;
}

/** Scatter chart point */
export interface ScatterPoint {
  x: number;
  y: number;
  label?: string;
  size?: number;
}

/** Scatter data grouped by category */
export interface ScatterGroups {
  [group: string]: ScatterPoint[];
}

/** Waterfall data item */
export interface WaterfallItem {
  label: string;
  value: number;
}

/** Treemap data item */
export interface TreemapItem {
  label: string;
  value: number;
}

/** Treemap internal rect */
export interface TreemapRect extends TreemapItem {
  rx: number;
  ry: number;
  rw: number;
  rh: number;
}

/** Computed plot area */
export interface PlotArea {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Nice scale result */
export interface NiceScale {
  min: number;
  max: number;
  step: number;
}

/** Tooltip content generation */
export type TooltipFormatter = (
  index: number,
  data: ResolvedData,
  theme: Theme
) => string;

// ── React Component Props ──────────────────────────────

/** Common props for all React chart components */
export interface ChartComponentProps {
  /** Data array (any schema) */
  data?: Record<string, any>[];
  /** Field mapping */
  mapping?: DataMapping;
  /** Chart width (CSS string or number) */
  width?: string | number;
  /** Chart height (CSS string or number) */
  height?: string | number;
  /** CSS class for container */
  className?: string;
  /** Inline styles for container */
  style?: React.CSSProperties;
  /** Called when user clicks a data point */
  onPointClick?: (index: number, data: ResolvedData) => void;
}

export interface LineComponentProps extends ChartComponentProps, LineChartConfig {}
export interface BarComponentProps extends ChartComponentProps, BaseChartConfig {}
export interface PieComponentProps extends ChartComponentProps, PieChartConfig {}
export interface ScatterComponentProps extends ChartComponentProps, BaseChartConfig {}
export interface RadarComponentProps extends ChartComponentProps, BaseChartConfig {}
export interface GaugeComponentProps extends ChartComponentProps, GaugeConfig {}
export interface HBarComponentProps extends ChartComponentProps, BaseChartConfig {}
export interface SparklineComponentProps {
  data?: number[];
  color?: string;
  filled?: boolean;
  animate?: boolean;
  animDuration?: number;
  width?: string | number;
  height?: string | number;
  className?: string;
  style?: React.CSSProperties;
  theme?: ThemeName | Theme;
}
export interface StackedAreaComponentProps extends ChartComponentProps, BaseChartConfig {}
export interface WaterfallComponentProps extends ChartComponentProps, BaseChartConfig {}
export interface TreemapComponentProps extends ChartComponentProps, BaseChartConfig {}
