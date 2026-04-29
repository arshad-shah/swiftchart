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

export const Line = forwardRef<ChartRef, LineComponentProps>(function Line(props, ref) {
  const { data, mapping, width, height, className, style, onPointClick, ...config } = props;
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useChart(LineChart, containerRef, { ...config, onClick: onPointClick }, data, mapping);
  useImperativeHandle(ref, () => makeImperative(chartRef));
  return <div ref={containerRef} className={className} style={makeContainerStyle(width, height, style)} />;
});

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

export const Bar = forwardRef<ChartRef, BarComponentProps>(function Bar(props, ref) {
  const { data, mapping, width, height, className, style, onPointClick, ...config } = props;
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useChart(BarChart, containerRef, { ...config, onClick: onPointClick }, data, mapping);
  useImperativeHandle(ref, () => makeImperative(chartRef));
  return <div ref={containerRef} className={className} style={makeContainerStyle(width, height, style)} />;
});

export const Pie = forwardRef<ChartRef, PieComponentProps>(function Pie(props, ref) {
  const { data, mapping, width, height, className, style, onPointClick, ...config } = props;
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useChart(PieChart, containerRef, { ...config, onClick: onPointClick }, data, mapping);
  useImperativeHandle(ref, () => makeImperative(chartRef));
  return <div ref={containerRef} className={className} style={makeContainerStyle(width, height, style)} />;
});

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

export const Scatter = forwardRef<ChartRef, ScatterComponentProps>(function Scatter(props, ref) {
  const { data, mapping, width, height, className, style, onPointClick, ...config } = props;
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useChart(ScatterChart, containerRef, { ...config, onClick: onPointClick }, data, mapping);
  useImperativeHandle(ref, () => makeImperative(chartRef));
  return <div ref={containerRef} className={className} style={makeContainerStyle(width, height, style)} />;
});

export const Radar = forwardRef<ChartRef, RadarComponentProps>(function Radar(props, ref) {
  const { data, mapping, width, height, className, style, onPointClick, ...config } = props;
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useChart(RadarChart, containerRef, { ...config, onClick: onPointClick }, data, mapping);
  useImperativeHandle(ref, () => makeImperative(chartRef));
  return <div ref={containerRef} className={className} style={makeContainerStyle(width, height, style)} />;
});

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

export const HBar = forwardRef<ChartRef, HBarComponentProps>(function HBar(props, ref) {
  const { data, mapping, width, height, className, style, onPointClick, ...config } = props;
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useChart(HBarChart, containerRef, { ...config, onClick: onPointClick }, data, mapping);
  useImperativeHandle(ref, () => makeImperative(chartRef));
  return <div ref={containerRef} className={className} style={makeContainerStyle(width, height, style)} />;
});

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

export const StackedArea = forwardRef<ChartRef, StackedAreaComponentProps>(function StackedArea(props, ref) {
  const { data, mapping, width, height, className, style, onPointClick, ...config } = props;
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useChart(StackedAreaChart, containerRef, { ...config, onClick: onPointClick }, data, mapping);
  useImperativeHandle(ref, () => makeImperative(chartRef));
  return <div ref={containerRef} className={className} style={makeContainerStyle(width, height, style)} />;
});

export const Waterfall = forwardRef<ChartRef, WaterfallComponentProps>(function Waterfall(props, ref) {
  const { data, mapping, width, height, className, style, onPointClick, ...config } = props;
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useChart(WaterfallChart, containerRef, { ...config, onClick: onPointClick }, data, mapping);
  useImperativeHandle(ref, () => makeImperative(chartRef));
  return <div ref={containerRef} className={className} style={makeContainerStyle(width, height, style)} />;
});

export const Treemap = forwardRef<ChartRef, TreemapComponentProps>(function Treemap(props, ref) {
  const { data, mapping, width, height, className, style, onPointClick, ...config } = props;
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useChart(TreemapChart, containerRef, { ...config, onClick: onPointClick }, data, mapping);
  useImperativeHandle(ref, () => makeImperative(chartRef));
  return <div ref={containerRef} className={className} style={makeContainerStyle(width, height, style)} />;
});
