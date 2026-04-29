// ═══════════════════════════════════════════════════════
// SwiftChart v1.0.0
// Lightning-fast, zero-dependency Canvas 2D charting
// ═══════════════════════════════════════════════════════

// Core
export { BaseChart } from './core/base';
export { Animator, EASINGS } from './core/animator';
export { Tooltip, type TooltipContent, type TooltipRow } from './core/tooltip';
export { THEMES, resolveTheme, addTheme } from './core/themes';

// Charts
export {
  BarChart,
  LineChart,
  PieChart,
  ScatterChart,
  RadarChart,
  GaugeChart,
  HBarChart,
  Sparkline,
  StackedAreaChart,
  WaterfallChart,
  TreemapChart,
  StackedBarChart,
  BubbleChart,
  HeatmapChart,
  CandlestickChart,
  BoxplotChart,
  FunnelChart,
  SankeyChart,
  ComboChart,
  RadialBarChart,
  BulletChart,
  MarimekkoChart,
  NetworkChart,
} from './charts';

// Utilities
export {
  dpr,
  lerp,
  clamp,
  niceNum,
  niceScale,
  shortNum,
  hexToRgba,
  lerpColor,
  escapeHtml,
  arrayMin,
  arrayMax,
  arraysExtent,
  resolveData,
} from './utils/helpers';

// Performance
export {
  lttbIndices,
  lttbDownsample,
  lttbDownsampleXY,
  autoTarget,
  Quadtree,
  visibleRange,
  visibleBarRange,
  isVisible,
  filterVisible,
  OffscreenRenderer,
  supportsOffscreen,
  executeCommands,
  StreamBuffer,
  StreamDataset,
  simulateForce,
  layoutSankey,
  fiveNumberSummary,
} from './perf';

export type {
  LTTBPoint,
  QTPoint,
  ViewportBounds,
  DrawCommand,
  PathSegment,
  ForceNode,
  ForceLink,
  ForceOptions,
  RawSankeyNode,
  RawSankeyLink,
  LaidOutSankeyNode,
  LaidOutSankeyLink,
  SankeyLayout,
  SankeyLayoutOptions,
  FiveNum,
} from './perf';

// Types
export type {
  Theme,
  ThemeName,
  EasingName,
  Padding,
  LegendPosition,
  Dataset,
  ResolvedData,
  DataMapping,
  BaseChartConfig,
  LineChartConfig,
  PieChartConfig,
  GaugeConfig,
  GaugeSegment,
  ScatterPoint,
  ScatterGroups,
  WaterfallItem,
  TreemapItem,
  TreemapRect,
  PlotArea,
  NiceScale,
  TooltipFormatter,
  StackedBarChartConfig,
  BubbleChartConfig,
  HeatmapChartConfig,
  CandlestickChartConfig,
  CandlestickItem,
  BoxplotChartConfig,
  BoxplotItem,
  FunnelChartConfig,
  FunnelItem,
  SankeyChartConfig,
  SankeyNode,
  SankeyLink,
  ComboChartConfig,
  RadialBarChartConfig,
  BulletChartConfig,
  BulletItem,
  MarimekkoChartConfig,
  NetworkChartConfig,
  NetworkNode,
  NetworkLink,
} from './types';
