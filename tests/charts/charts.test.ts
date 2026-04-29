import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  BarChart, LineChart, PieChart, ScatterChart,
  RadarChart, GaugeChart, HBarChart, Sparkline,
  StackedAreaChart, WaterfallChart, TreemapChart,
} from '../../src/charts';

function createContainer(w = 600, h = 400): HTMLDivElement {
  const div = document.createElement('div');
  div.style.width = `${w}px`;
  div.style.height = `${h}px`;
  document.body.appendChild(div);
  return div;
}

// ═══════════════════════════════════════════════════════
// Chart factory tests
// ═══════════════════════════════════════════════════════
const CHART_CLASSES = [
  { name: 'BarChart', Cls: BarChart, config: {} },
  { name: 'LineChart', Cls: LineChart, config: {} },
  { name: 'PieChart', Cls: PieChart, config: {} },
  { name: 'ScatterChart', Cls: ScatterChart, config: {} },
  { name: 'RadarChart', Cls: RadarChart, config: {} },
  { name: 'GaugeChart', Cls: GaugeChart, config: {} },
  { name: 'HBarChart', Cls: HBarChart, config: {} },
  { name: 'Sparkline', Cls: Sparkline, config: {} },
  { name: 'StackedAreaChart', Cls: StackedAreaChart, config: {} },
  { name: 'WaterfallChart', Cls: WaterfallChart, config: {} },
  { name: 'TreemapChart', Cls: TreemapChart, config: {} },
] as const;

describe.each(CHART_CLASSES)('$name', ({ Cls, config }) => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = createContainer();
  });

  it('creates a canvas inside the container', () => {
    const chart = new Cls(container, config);
    expect(container.querySelector('canvas')).toBeTruthy();
    chart.destroy();
  });

  it('accepts string selector', () => {
    container.id = 'test-chart-' + Math.random().toString(36).slice(2);
    document.body.appendChild(container);
    const chart = new Cls(`#${container.id}`, config);
    expect(container.querySelector('canvas')).toBeTruthy();
    chart.destroy();
  });

  it('throws for invalid selector', () => {
    expect(() => new Cls('#nonexistent', config)).toThrow();
  });

  it('sets default config values', () => {
    const chart = new Cls(container, config);
    expect(chart.config.animate).toBe(true);
    // Some charts override grid/tooltip/legend defaults
    const noGrid = ['GaugeChart', 'Sparkline', 'TreemapChart'];
    const noTooltip = ['Sparkline'];
    expect(chart.config.showGrid).toBe(!noGrid.includes(Cls.name));
    expect(chart.config.showTooltip).toBe(!noTooltip.includes(Cls.name));
    chart.destroy();
  });

  it('applies custom config', () => {
    const chart = new Cls(container, {
      ...config,
      animate: false,
      title: 'Test',
      theme: 'arctic',
    });
    expect(chart.config.animate).toBe(false);
    expect(chart.config.title).toBe('Test');
    chart.destroy();
  });

  it('destroy removes canvas and cleans up', () => {
    const chart = new Cls(container, config);
    chart.destroy();
    expect(container.querySelector('canvas')).toBeNull();
  });

  it('destroy is idempotent (no double-free crash)', () => {
    const chart = new Cls(container, config);
    chart.destroy();
    // Second destroy should not throw
    expect(() => chart.destroy()).not.toThrow();
  });

  it('setTheme changes theme without throwing', () => {
    const chart = new Cls(container, config);
    expect(() => chart.setTheme('arctic')).not.toThrow();
    expect(() => chart.setTheme('ember')).not.toThrow();
    expect(() => chart.setTheme('forest')).not.toThrow();
    expect(() => chart.setTheme('midnight')).not.toThrow();
    chart.destroy();
  });

  it('plotArea returns valid dimensions', () => {
    const chart = new Cls(container, config);
    const p = chart.plotArea;
    expect(p.w).toBeGreaterThanOrEqual(0);
    expect(p.h).toBeGreaterThanOrEqual(0);
    expect(p.x).toBeGreaterThanOrEqual(0);
    expect(p.y).toBeGreaterThanOrEqual(0);
    chart.destroy();
  });

  it('resize() does not throw', () => {
    const chart = new Cls(container, config);
    expect(() => chart.resize()).not.toThrow();
    chart.destroy();
  });

  it('works without animation', () => {
    const chart = new Cls(container, { ...config, animate: false });
    expect(chart.animProgress).toBe(1);
    chart.destroy();
  });

  it('works without tooltip', () => {
    const chart = new Cls(container, { ...config, showTooltip: false });
    expect(chart.tooltip).toBeNull();
    chart.destroy();
  });

  it('applies formatValue function', () => {
    const fmt = (v: number) => `$${v}`;
    const chart = new Cls(container, { ...config, formatValue: fmt });
    expect(chart.config.formatValue).toBe(fmt);
    chart.destroy();
  });
});

// ═══════════════════════════════════════════════════════
// Data-specific tests per chart type
// ═══════════════════════════════════════════════════════

describe('BarChart — data', () => {
  let container: HTMLDivElement;
  beforeEach(() => { container = createContainer(); });

  it('renders with object array data', () => {
    const chart = new BarChart(container, { animate: false });
    chart.setData([
      { region: 'US', sales: 100 },
      { region: 'EU', sales: 200 },
    ], { x: 'region', y: 'sales' });
    expect(chart.resolved.labels).toEqual(['US', 'EU']);
    expect(chart.resolved.datasets[0].data).toEqual([100, 200]);
    chart.destroy();
  });

  it('renders with multiple series', () => {
    const chart = new BarChart(container, { animate: false });
    chart.setData([
      { q: 'Q1', a: 10, b: 20 },
      { q: 'Q2', a: 30, b: 40 },
    ], { x: 'q', y: ['a', 'b'] });
    expect(chart.resolved.datasets.length).toBe(2);
    chart.destroy();
  });

  it('handles empty data gracefully', () => {
    const chart = new BarChart(container, { animate: false });
    expect(() => chart.setData([])).not.toThrow();
    expect(chart.resolved.labels).toEqual([]);
    chart.destroy();
  });

  it('handles negative values', () => {
    const chart = new BarChart(container, { animate: false });
    chart.setData([
      { x: 'A', y: -50 },
      { x: 'B', y: 100 },
    ], { x: 'x', y: 'y' });
    expect(chart.resolved.datasets[0].data).toEqual([-50, 100]);
    chart.destroy();
  });

  it('update() re-sets data', () => {
    const chart = new BarChart(container, { animate: false });
    chart.setData([{ x: 'A', y: 10 }], { x: 'x', y: 'y' });
    chart.update([{ x: 'B', y: 20 }], { x: 'x', y: 'y' });
    expect(chart.resolved.labels).toEqual(['B']);
    chart.destroy();
  });
});

describe('LineChart — data', () => {
  let container: HTMLDivElement;
  beforeEach(() => { container = createContainer(); });

  it('renders line with area fill', () => {
    const chart = new LineChart(container, { area: true, animate: false });
    chart.setData([
      { month: 'Jan', val: 10 },
      { month: 'Feb', val: 20 },
      { month: 'Mar', val: 15 },
    ], { x: 'month', y: 'val' });
    expect(chart.resolved.labels.length).toBe(3);
    chart.destroy();
  });

  it('works with smooth=false', () => {
    const chart = new LineChart(container, { smooth: false, animate: false });
    chart.setData([{ x: 'A', y: 1 }, { x: 'B', y: 2 }], { x: 'x', y: 'y' });
    expect(chart.resolved.datasets[0].data).toEqual([1, 2]);
    chart.destroy();
  });

  it('works with dots=false', () => {
    const chart = new LineChart(container, { dots: false, animate: false });
    chart.setData([{ x: 'A', y: 1 }], { x: 'x', y: 'y' });
    chart.destroy();
  });

  it('handles single data point', () => {
    const chart = new LineChart(container, { animate: false });
    chart.setData([{ x: 'A', y: 42 }], { x: 'x', y: 'y' });
    expect(chart.resolved.labels).toEqual(['A']);
    chart.destroy();
  });
});

describe('PieChart — data', () => {
  let container: HTMLDivElement;
  beforeEach(() => { container = createContainer(); });

  it('renders pie from object array', () => {
    const chart = new PieChart(container, { animate: false });
    chart.setData([
      { name: 'A', value: 30 },
      { name: 'B', value: 70 },
    ], { labelField: 'name', valueField: 'value' });
    expect(chart.resolved.labels).toEqual(['A', 'B']);
    expect(chart.resolved.datasets[0].data).toEqual([30, 70]);
    chart.destroy();
  });

  it('renders donut variant', () => {
    const chart = new PieChart(container, { donut: true, animate: false });
    chart.setData([{ name: 'X', value: 100 }], { labelField: 'name', valueField: 'value' });
    chart.destroy();
  });

  it('uses labels/values mapping', () => {
    const chart = new PieChart(container, { animate: false });
    chart.setData([], { labels: ['A', 'B'], values: [10, 20] });
    expect(chart.resolved.labels).toEqual(['A', 'B']);
    chart.destroy();
  });
});

describe('ScatterChart — data', () => {
  let container: HTMLDivElement;
  beforeEach(() => { container = createContainer(); });

  it('renders scatter points', () => {
    const chart = new ScatterChart(container, { animate: false });
    chart.setData([
      { x: 10, y: 20, label: 'P1' },
      { x: 30, y: 40, label: 'P2' },
    ], { x: 'x', y: 'y' });
    expect(chart.scatterData).toBeTruthy();
    expect(Object.values(chart.scatterData!).flat().length).toBe(2);
    chart.destroy();
  });

  it('groups scatter by category', () => {
    const chart = new ScatterChart(container, { animate: false });
    chart.setData([
      { x: 1, y: 2, group: 'A' },
      { x: 3, y: 4, group: 'A' },
      { x: 5, y: 6, group: 'B' },
    ], { x: 'x', y: 'y', groupField: 'group' });
    expect(Object.keys(chart.scatterData!).length).toBe(2);
    chart.destroy();
  });
});

describe('GaugeChart — data', () => {
  let container: HTMLDivElement;
  beforeEach(() => { container = createContainer(); });

  it('sets value via setValue', () => {
    const chart = new GaugeChart(container, { animate: false, value: 50 });
    chart.setValue(75);
    // No crash
    chart.destroy();
  });

  it('respects min/max/segments', () => {
    const chart = new GaugeChart(container, {
      animate: false, min: 0, max: 200, value: 150,
      segments: [
        { color: '#0f0', to: 100 },
        { color: '#f00', to: 200 },
      ],
    });
    chart.destroy();
  });
});

describe('WaterfallChart — data', () => {
  let container: HTMLDivElement;
  beforeEach(() => { container = createContainer(); });

  it('renders waterfall items', () => {
    const chart = new WaterfallChart(container, { animate: false });
    chart.setData([
      { label: 'Revenue', value: 1000 },
      { label: 'Cost', value: -400 },
      { label: 'Tax', value: -100 },
    ], { labelField: 'label', valueField: 'value' });
    chart.destroy();
  });
});

describe('TreemapChart — data', () => {
  let container: HTMLDivElement;
  beforeEach(() => { container = createContainer(); });

  it('renders treemap from data', () => {
    const chart = new TreemapChart(container, { animate: false });
    chart.setData([
      { name: 'Big', value: 100 },
      { name: 'Medium', value: 50 },
      { name: 'Small', value: 20 },
    ], { labelField: 'name', valueField: 'value' });
    chart.destroy();
  });

  it('handles single item', () => {
    const chart = new TreemapChart(container, { animate: false });
    chart.setData([{ name: 'Only', value: 42 }], { labelField: 'name', valueField: 'value' });
    chart.destroy();
  });
});

describe('Sparkline — data', () => {
  let container: HTMLDivElement;
  beforeEach(() => { container = createContainer(); });

  it('renders from number array', () => {
    const chart = new Sparkline(container, { animate: false });
    chart.setData([10, 20, 15, 25, 30]);
    chart.destroy();
  });

  it('handles empty array', () => {
    const chart = new Sparkline(container, { animate: false });
    chart.setData([]);
    chart.destroy();
  });

  it('respects custom color', () => {
    const chart = new Sparkline(container, { animate: false, color: '#ff0000' });
    chart.setData([1, 2, 3]);
    chart.destroy();
  });

  it('respects filled=false', () => {
    const chart = new Sparkline(container, { animate: false, filled: false });
    chart.setData([1, 2, 3]);
    chart.destroy();
  });
});

describe('StackedAreaChart — data', () => {
  let container: HTMLDivElement;
  beforeEach(() => { container = createContainer(); });

  it('stacks multiple series', () => {
    const chart = new StackedAreaChart(container, { animate: false });
    chart.setData([
      { month: 'Jan', a: 10, b: 20 },
      { month: 'Feb', a: 15, b: 25 },
    ], { x: 'month', y: ['a', 'b'] });
    expect(chart.resolved.datasets.length).toBe(2);
    chart.destroy();
  });
});

describe('RadarChart — data', () => {
  let container: HTMLDivElement;
  beforeEach(() => { container = createContainer(); });

  it('renders with pre-built datasets', () => {
    const chart = new RadarChart(container, { animate: false });
    chart.setData([], {
      labels: ['Speed', 'Size', 'Ease'],
      datasets: [
        { label: 'A', data: [90, 70, 80] },
        { label: 'B', data: [60, 85, 75] },
      ],
    });
    expect(chart.resolved.labels.length).toBe(3);
    chart.destroy();
  });
});

describe('HBarChart — data', () => {
  let container: HTMLDivElement;
  beforeEach(() => { container = createContainer(); });

  it('renders horizontal bars', () => {
    const chart = new HBarChart(container, { animate: false });
    chart.setData([
      { lang: 'TS', devs: 8000 },
      { lang: 'Rust', devs: 4000 },
    ], { x: 'lang', y: 'devs' });
    expect(chart.resolved.labels).toEqual(['TS', 'Rust']);
    chart.destroy();
  });
});
