import type { ComponentType } from 'react';
import {
  Line, Area, Bar, HBar, Pie, Donut, Scatter, Radar, Gauge,
  SparklineComponent, StackedArea, Waterfall, Treemap,
  StackedBar, Bubble, Heatmap, Candlestick, Boxplot, Funnel, Sankey,
  Combo, RadialBar, Bullet, Marimekko, Network,
} from '@arshad-shah/swift-chart/react';

type Kind =
  | 'line' | 'area' | 'bar' | 'hbar' | 'pie' | 'donut' | 'scatter'
  | 'radar' | 'gauge' | 'sparkline' | 'stacked-area' | 'waterfall' | 'treemap'
  | 'stacked-bar' | 'bubble' | 'heatmap' | 'candlestick' | 'boxplot'
  | 'funnel' | 'sankey' | 'combo' | 'radial-bar' | 'bullet'
  | 'marimekko' | 'network';

type Props = {
  kind: Kind;
  height?: number;
  data?: unknown;
  mapping?: unknown;
  options?: Record<string, unknown>;
} & Record<string, unknown>;

const REGISTRY: Record<Kind, ComponentType<Record<string, unknown>>> = {
  'line': Line as unknown as ComponentType<Record<string, unknown>>,
  'area': Area as unknown as ComponentType<Record<string, unknown>>,
  'bar': Bar as unknown as ComponentType<Record<string, unknown>>,
  'hbar': HBar as unknown as ComponentType<Record<string, unknown>>,
  'pie': Pie as unknown as ComponentType<Record<string, unknown>>,
  'donut': Donut as unknown as ComponentType<Record<string, unknown>>,
  'scatter': Scatter as unknown as ComponentType<Record<string, unknown>>,
  'radar': Radar as unknown as ComponentType<Record<string, unknown>>,
  'gauge': Gauge as unknown as ComponentType<Record<string, unknown>>,
  'sparkline': SparklineComponent as unknown as ComponentType<Record<string, unknown>>,
  'stacked-area': StackedArea as unknown as ComponentType<Record<string, unknown>>,
  'waterfall': Waterfall as unknown as ComponentType<Record<string, unknown>>,
  'treemap': Treemap as unknown as ComponentType<Record<string, unknown>>,
  'stacked-bar': StackedBar as unknown as ComponentType<Record<string, unknown>>,
  'bubble': Bubble as unknown as ComponentType<Record<string, unknown>>,
  'heatmap': Heatmap as unknown as ComponentType<Record<string, unknown>>,
  'candlestick': Candlestick as unknown as ComponentType<Record<string, unknown>>,
  'boxplot': Boxplot as unknown as ComponentType<Record<string, unknown>>,
  'funnel': Funnel as unknown as ComponentType<Record<string, unknown>>,
  'sankey': Sankey as unknown as ComponentType<Record<string, unknown>>,
  'combo': Combo as unknown as ComponentType<Record<string, unknown>>,
  'radial-bar': RadialBar as unknown as ComponentType<Record<string, unknown>>,
  'bullet': Bullet as unknown as ComponentType<Record<string, unknown>>,
  'marimekko': Marimekko as unknown as ComponentType<Record<string, unknown>>,
  'network': Network as unknown as ComponentType<Record<string, unknown>>,
};

export default function ChartPreview({ kind, height = 300, options, ...rest }: Props) {
  const Component = REGISTRY[kind];
  if (!Component) {
    return <div className="chart-frame">Unknown chart kind: {kind}</div>;
  }
  const flatProps = { ...(options ?? {}), ...rest, height };
  return (
    <div className="chart-frame">
      <Component {...flatProps} />
    </div>
  );
}
