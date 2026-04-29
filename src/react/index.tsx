'use client';

import {
  useRef, useEffect, forwardRef, useImperativeHandle, useMemo,
  type CSSProperties, type RefObject,
} from 'react';
import type {
  LineComponentProps, BarComponentProps, PieComponentProps,
  ScatterComponentProps, RadarComponentProps, GaugeComponentProps,
  HBarComponentProps, SparklineComponentProps, StackedAreaComponentProps,
  WaterfallComponentProps, TreemapComponentProps, DataMapping,
} from '../types';
import { BaseChart } from '../core/base';
import { LineChart } from '../charts/line';
import { BarChart } from '../charts/bar';
import { PieChart } from '../charts/pie';
import {
  ScatterChart, RadarChart, GaugeChart, HBarChart,
  Sparkline as SparklineChart, StackedAreaChart,
  WaterfallChart, TreemapChart,
} from '../charts/extra';

// ── Generic hook ───────────────────────────────────────

export interface ChartRef {
  /** The underlying SwiftChart instance */
  chart: BaseChart | null;
  /** Force a resize recalculation */
  resize: () => void;
  /** Export current chart as PNG data URL. */
  toDataURL: (type?: string, quality?: number) => string | null;
}

/**
 * Stable JSON-stringify for useEffect dependencies.
 * Cheap, and protects callers from re-running effects on every render
 * when they pass `mapping={{x:'a', y:'b'}}` literals.
 */
function shallowKey(obj: unknown): string {
  if (obj == null) return '';
  try { return JSON.stringify(obj); } catch { return ''; }
}

function useChart<T extends BaseChart>(
  ChartClass: new (el: HTMLElement, config: any) => T,
  containerRef: RefObject<HTMLDivElement | null>,
  config: Record<string, any>,
  data: Record<string, any>[] | number[] | undefined,
  mapping: DataMapping | undefined,
  extraDepKey = '',
): RefObject<T | null> {
  const chartRef = useRef<T | null>(null);

  // Stable keys for deps so object literals don't trigger re-runs.
  const themeKey = typeof config.theme === 'string'
    ? config.theme
    : shallowKey(config.theme);
  const mappingSig = shallowKey(mapping);
  const mappingKey = useMemo(() => mappingSig, [mappingSig]);

  // Pre-built data is sometimes carried entirely on `mapping`
  // (e.g. streaming: mapping={{ labels, datasets }}). Treat that as the
  // signal that setData should fire even if `data` is undefined.
  const mappingHasInlineData =
    !!(mapping && (mapping as any).labels && (mapping as any).datasets);

  // Forward every non-data, non-mount config field to chart.update()
  // so chart-specific props (donut, donutWidth, area, smooth, dots,
  // lineWidth, segments, animate, …) stay in sync without recreating
  // the chart. `theme` is excluded because it has its own setTheme path,
  // and `onClick` is a function that update() doesn't need to diff.
  const updatable: Record<string, any> = {};
  for (const k in config) {
    if (k === 'theme' || k === 'onClick') continue;
    updatable[k] = (config as any)[k];
  }
  const configKey = shallowKey(updatable);

  // Create chart once per container — never recreate. Every config change
  // (including `animate`) flows through chart.update() below; recreating
  // would orphan the data props (data effect deps are stable across recreates,
  // so the new instance would render empty).
  useEffect(() => {
    if (!containerRef.current) return;
    const chart = new ChartClass(containerRef.current, config);
    chartRef.current = chart;
    return () => {
      chart.destroy();
      chartRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Theme switch.
  useEffect(() => {
    const c = chartRef.current;
    if (!c) return;
    if (typeof config.theme === 'string') {
      c.setTheme(config.theme);
    } else if (config.theme) {
      c.update({ theme: config.theme });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [themeKey]);

  // Apply non-data config changes via chart.update().
  useEffect(() => {
    const c = chartRef.current;
    if (!c) return;
    c.update(updatable);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [configKey]);

  // Update data when data identity or mapping shape changes.
  useEffect(() => {
    const c = chartRef.current;
    if (!c) return;
    if (data === undefined && !mappingHasInlineData) return;
    c.setData((data ?? []) as any, mapping);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, mappingKey, extraDepKey]);

  return chartRef;
}

// ── Container wrapper ──────────────────────────────────

const defaultContainerStyle: CSSProperties = {
  width: '100%',
  height: '100%',
  minHeight: 200,
  position: 'relative',
};

function makeContainerStyle(
  width?: string | number,
  height?: string | number,
  style?: CSSProperties,
  minHeight: number = 200,
): CSSProperties {
  return {
    ...defaultContainerStyle,
    minHeight,
    ...(width !== undefined && { width: typeof width === 'number' ? `${width}px` : width }),
    ...(height !== undefined && { height: typeof height === 'number' ? `${height}px` : height }),
    ...style,
  };
}

function makeImperative<T extends BaseChart>(chartRef: RefObject<T | null>): ChartRef {
  return {
    get chart() { return chartRef.current; },
    resize: () => chartRef.current?.resize(),
    toDataURL: (type, quality) => chartRef.current?.toDataURL(type, quality) ?? null,
  };
}

// ═══════════════════════════════════════════════════════
// React Components
// ═══════════════════════════════════════════════════════

/**
 * Line chart React component. Forwards a {@link ChartRef} for imperative ops.
 *
 * @example
 * ```tsx
 * import { Line } from '@arshad-shah/swift-chart/react';
 *
 * <Line
 *   data={salesData}
 *   mapping={{ x: 'month', y: ['revenue', 'target'] }}
 *   theme="midnight"
 *   smooth dots
 *   height={320}
 * />
 * ```
 */
export const Line = forwardRef<ChartRef, LineComponentProps>(function Line(props, ref) {
  const { data, mapping, width, height, className, style, onPointClick, ...config } = props;
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useChart(LineChart, containerRef, { ...config, onClick: onPointClick }, data, mapping);
  useImperativeHandle(ref, () => makeImperative(chartRef));
  return <div ref={containerRef} className={className} style={makeContainerStyle(width, height, style)} />;
});

/**
 * Area chart React component. Equivalent to `<Line area />`.
 *
 * @example
 * ```tsx
 * <Area data={salesData} mapping={{ x: 'month', y: 'revenue' }} theme="midnight" height={300} />
 * ```
 */
export const Area = forwardRef<ChartRef, LineComponentProps>(function Area(props, ref) {
  const { data, mapping, width, height, className, style, onPointClick, ...config } = props;
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useChart(
    LineChart, containerRef,
    { ...config, area: true, onClick: onPointClick },
    data, mapping,
  );
  useImperativeHandle(ref, () => makeImperative(chartRef));
  return <div ref={containerRef} className={className} style={makeContainerStyle(width, height, style)} />;
});

/**
 * Bar chart React component. Pass a `string[]` to `mapping.y` for grouped bars.
 *
 * @example
 * ```tsx
 * <Bar data={rows} mapping={{ x: 'region', y: ['sales', 'target'] }} theme="arctic" />
 * ```
 */
export const Bar = forwardRef<ChartRef, BarComponentProps>(function Bar(props, ref) {
  const { data, mapping, width, height, className, style, onPointClick, ...config } = props;
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useChart(BarChart, containerRef, { ...config, onClick: onPointClick }, data, mapping);
  useImperativeHandle(ref, () => makeImperative(chartRef));
  return <div ref={containerRef} className={className} style={makeContainerStyle(width, height, style)} />;
});

/**
 * Pie chart React component. Use {@link Donut} for the ring variant.
 *
 * @example
 * ```tsx
 * <Pie data={traffic} mapping={{ labelField: 'source', valueField: 'visits' }} />
 * ```
 */
export const Pie = forwardRef<ChartRef, PieComponentProps>(function Pie(props, ref) {
  const { data, mapping, width, height, className, style, onPointClick, ...config } = props;
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useChart(PieChart, containerRef, { ...config, onClick: onPointClick }, data, mapping);
  useImperativeHandle(ref, () => makeImperative(chartRef));
  return <div ref={containerRef} className={className} style={makeContainerStyle(width, height, style)} />;
});

/**
 * Donut chart React component. Equivalent to `<Pie donut />`.
 *
 * Tune `donutWidth` (0 to 1) for ring thickness; lower values produce a thicker ring.
 *
 * @example
 * ```tsx
 * <Donut
 *   data={traffic}
 *   mapping={{ labelField: 'source', valueField: 'visits' }}
 *   donutWidth={0.55}
 * />
 * ```
 */
export const Donut = forwardRef<ChartRef, PieComponentProps>(function Donut(props, ref) {
  const { data, mapping, width, height, className, style, onPointClick, ...config } = props;
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useChart(
    PieChart, containerRef,
    { ...config, donut: true, onClick: onPointClick },
    data, mapping,
  );
  useImperativeHandle(ref, () => makeImperative(chartRef));
  return <div ref={containerRef} className={className} style={makeContainerStyle(width, height, style)} />;
});

/**
 * Scatter / bubble chart React component.
 *
 * Use `mapping.groupField` to colour points by category and `mapping.sizeField`
 * to vary point radius.
 *
 * @example
 * ```tsx
 * <Scatter
 *   data={points}
 *   mapping={{ x: 'x', y: 'y', groupField: 'group', sizeField: 'size' }}
 * />
 * ```
 */
export const Scatter = forwardRef<ChartRef, ScatterComponentProps>(function Scatter(props, ref) {
  const { data, mapping, width, height, className, style, onPointClick, ...config } = props;
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useChart(ScatterChart, containerRef, { ...config, onClick: onPointClick }, data, mapping);
  useImperativeHandle(ref, () => makeImperative(chartRef));
  return <div ref={containerRef} className={className} style={makeContainerStyle(width, height, style)} />;
});

/**
 * Radar / spider chart React component for multi-axis comparison.
 *
 * @example
 * ```tsx
 * <Radar data={skills} mapping={{ x: 'axis', y: ['teamA', 'teamB'] }} />
 * ```
 */
export const Radar = forwardRef<ChartRef, RadarComponentProps>(function Radar(props, ref) {
  const { data, mapping, width, height, className, style, onPointClick, ...config } = props;
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useChart(RadarChart, containerRef, { ...config, onClick: onPointClick }, data, mapping);
  useImperativeHandle(ref, () => makeImperative(chartRef));
  return <div ref={containerRef} className={className} style={makeContainerStyle(width, height, style)} />;
});

/**
 * Gauge / meter React component. Updates the needle imperatively when `value`
 * changes, without recreating the chart.
 *
 * @example
 * ```tsx
 * <Gauge
 *   value={72}
 *   min={0} max={100}
 *   segments={[
 *     { from: 0,  to: 60,  color: '#5b8cff' },
 *     { from: 60, to: 85,  color: '#ffa45b' },
 *     { from: 85, to: 100, color: '#ff5b5b' },
 *   ]}
 * />
 * ```
 */
export const Gauge = forwardRef<ChartRef, GaugeComponentProps>(function Gauge(props, ref) {
  const { data, mapping, width, height, className, style, value, ...config } = props;
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useChart(
    GaugeChart, containerRef, { ...config, value }, data, mapping,
    String(value ?? ''),
  );

  // Direct value update without recreating the chart
  useEffect(() => {
    if (chartRef.current && value !== undefined) {
      (chartRef.current as GaugeChart).setValue(value);
    }
    // chartRef is a ref — stable identity, intentionally omitted.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  useImperativeHandle(ref, () => makeImperative(chartRef));
  return <div ref={containerRef} className={className} style={makeContainerStyle(width, height, style)} />;
});

/**
 * Horizontal bar chart React component.
 *
 * Mapping: `x` is the categorical label field, `y` is the numeric value field.
 *
 * @example
 * ```tsx
 * <HBar data={traffic} mapping={{ x: 'source', y: 'visits' }} theme="midnight" />
 * ```
 */
export const HBar = forwardRef<ChartRef, HBarComponentProps>(function HBar(props, ref) {
  const { data, mapping, width, height, className, style, onPointClick, ...config } = props;
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useChart(HBarChart, containerRef, { ...config, onClick: onPointClick }, data, mapping);
  useImperativeHandle(ref, () => makeImperative(chartRef));
  return <div ref={containerRef} className={className} style={makeContainerStyle(width, height, style)} />;
});

/**
 * Inline sparkline React component - axis-less mini chart for KPI rows.
 *
 * Accepts a plain `number[]` for `data` (no mapping needed).
 *
 * @example
 * ```tsx
 * <SparklineComponent data={[12, 14, 13, 18, 22]} color="#5b8cff" filled height={32} />
 * ```
 */
export const SparklineComponent = forwardRef<ChartRef, SparklineComponentProps>(
  function SparklineComponent(props, ref) {
    const { data, color, filled, animate, animDuration, width, height, className, style, theme } = props;
    const containerRef = useRef<HTMLDivElement>(null);
    const chartRef = useChart(
      SparklineChart, containerRef,
      { color, filled, animate, animDuration, theme },
      data as any, undefined,
    );
    useImperativeHandle(ref, () => makeImperative(chartRef));
    return (
      <div
        ref={containerRef}
        className={className}
        style={makeContainerStyle(width ?? '100%', height ?? 40, style, /*minHeight=*/24)}
      />
    );
  }
);

/**
 * Stacked area chart React component.
 *
 * @example
 * ```tsx
 * <StackedArea data={traffic} mapping={{ x: 'day', y: ['api', 'web', 'mobile'] }} />
 * ```
 */
export const StackedArea = forwardRef<ChartRef, StackedAreaComponentProps>(function StackedArea(props, ref) {
  const { data, mapping, width, height, className, style, onPointClick, ...config } = props;
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useChart(StackedAreaChart, containerRef, { ...config, onClick: onPointClick }, data, mapping);
  useImperativeHandle(ref, () => makeImperative(chartRef));
  return <div ref={containerRef} className={className} style={makeContainerStyle(width, height, style)} />;
});

/**
 * Waterfall chart React component for incremental positive/negative changes.
 *
 * @example
 * ```tsx
 * <Waterfall
 *   data={[
 *     { label: 'Q1',   value: 120 },
 *     { label: 'Q2',   value: 45 },
 *     { label: 'Q3',   value: -22 },
 *     { label: 'Q4',   value: 67 },
 *   ]}
 * />
 * ```
 */
export const Waterfall = forwardRef<ChartRef, WaterfallComponentProps>(function Waterfall(props, ref) {
  const { data, mapping, width, height, className, style, onPointClick, ...config } = props;
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useChart(WaterfallChart, containerRef, { ...config, onClick: onPointClick }, data, mapping);
  useImperativeHandle(ref, () => makeImperative(chartRef));
  return <div ref={containerRef} className={className} style={makeContainerStyle(width, height, style)} />;
});

/**
 * Treemap React component - squarified rectangles proportional to value.
 *
 * @example
 * ```tsx
 * <Treemap data={[
 *   { label: 'Compute', value: 42 },
 *   { label: 'Storage', value: 28 },
 * ]} />
 * ```
 */
export const Treemap = forwardRef<ChartRef, TreemapComponentProps>(function Treemap(props, ref) {
  const { data, mapping, width, height, className, style, onPointClick, ...config } = props;
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useChart(TreemapChart, containerRef, { ...config, onClick: onPointClick }, data, mapping);
  useImperativeHandle(ref, () => makeImperative(chartRef));
  return <div ref={containerRef} className={className} style={makeContainerStyle(width, height, style)} />;
});
