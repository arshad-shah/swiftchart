import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  BarChart, LineChart, PieChart, GaugeChart, Sparkline,
  TreemapChart, WaterfallChart, StackedAreaChart,
  addTheme, THEMES, resolveData, niceScale, shortNum,
} from '../../src';

function createContainer(): HTMLDivElement {
  const div = document.createElement('div');
  div.style.width = '800px';
  div.style.height = '500px';
  document.body.appendChild(div);
  return div;
}

describe('Integration: Schema-agnostic data ingestion', () => {
  it('auto-detects from API-like response', () => {
    const apiResponse = [
      { timestamp: '2025-01-01', cpu_usage: 45.2, memory_gb: 12.3 },
      { timestamp: '2025-01-02', cpu_usage: 52.1, memory_gb: 13.1 },
      { timestamp: '2025-01-03', cpu_usage: 38.9, memory_gb: 11.8 },
    ];
    const result = resolveData(apiResponse, {});
    expect(result.labels).toEqual(['2025-01-01', '2025-01-02', '2025-01-03']);
    expect(result.datasets.length).toBe(2);
    expect(result.datasets[0].label).toBe('cpu_usage');
    expect(result.datasets[1].label).toBe('memory_gb');
  });

  it('works with explicit field mapping', () => {
    const data = [
      { date: '2025-01', metric_a: 100, metric_b: 200, notes: 'good' },
      { date: '2025-02', metric_a: 150, metric_b: 180, notes: 'ok' },
    ];
    const result = resolveData(data, {
      x: 'date',
      y: ['metric_a', 'metric_b'],
      seriesNames: ['CPU', 'Memory'],
    });
    expect(result.labels).toEqual(['2025-01', '2025-02']);
    expect(result.datasets[0].label).toBe('CPU');
    expect(result.datasets[1].label).toBe('Memory');
  });

  it('handles mixed types gracefully', () => {
    const data = [
      { id: 1, name: 'Alpha', score: '95.5' },
      { id: 2, name: 'Beta', score: 'invalid' },
      { id: 3, name: 'Gamma', score: 88 },
    ];
    const result = resolveData(data, { x: 'name', y: 'score' });
    expect(result.datasets[0].data).toEqual([95.5, 0, 88]);
  });
});

describe('Integration: Full chart lifecycle', () => {
  let container: HTMLDivElement;
  beforeEach(() => { container = createContainer(); });

  it('create → setData → setTheme → update → destroy', () => {
    const chart = new LineChart(container, {
      animate: false,
      title: 'Lifecycle Test',
      subtitle: 'Full test',
      showLegend: true,
    });

    // Initial data
    chart.setData([
      { month: 'Jan', val: 10 },
      { month: 'Feb', val: 20 },
    ], { x: 'month', y: 'val' });
    expect(chart.resolved.labels.length).toBe(2);

    // Theme change
    chart.setTheme('arctic');
    expect(chart.theme).toEqual(THEMES.arctic);

    // Data update
    chart.update([
      { month: 'Mar', val: 30 },
      { month: 'Apr', val: 40 },
      { month: 'May', val: 50 },
    ], { x: 'month', y: 'val' });
    expect(chart.resolved.labels.length).toBe(3);

    // Resize
    chart.resize();

    // Destroy
    chart.destroy();
    expect(container.querySelector('canvas')).toBeNull();
  });

  it('handles all 4 built-in themes', () => {
    const chart = new BarChart(container, { animate: false });
    chart.setData([{ x: 'A', y: 10 }], { x: 'x', y: 'y' });

    ['midnight', 'arctic', 'ember', 'forest'].forEach(theme => {
      expect(() => chart.setTheme(theme)).not.toThrow();
      expect(chart.theme).toEqual(THEMES[theme]);
    });

    chart.destroy();
  });

  it('custom theme registration and usage', () => {
    addTheme('cyberpunk', {
      bg: '#0a000f',
      surface: '#150020',
      grid: '#ff00ff15',
      text: '#ff00ff',
      textMuted: '#aa00aa',
      axis: '#440044',
      colors: ['#ff00ff', '#00ffff', '#ffff00'],
    });

    const chart = new LineChart(container, {
      animate: false,
      theme: 'cyberpunk',
    });
    chart.setData([{ x: 'A', y: 10 }], { x: 'x', y: 'y' });
    expect(chart.theme.bg).toBe('#0a000f');
    chart.destroy();

    // Cleanup
    delete THEMES['cyberpunk'];
  });
});

describe('Integration: Gauge value animation', () => {
  let container: HTMLDivElement;
  beforeEach(() => { container = createContainer(); });

  it('setValue triggers re-render', () => {
    const chart = new GaugeChart(container, {
      animate: false,
      min: 0, max: 100, value: 0,
    });
    chart.setValue(50);
    chart.setValue(100);
    chart.setValue(0);
    chart.destroy();
  });
});

describe('Integration: Large dataset performance', () => {
  let container: HTMLDivElement;
  beforeEach(() => { container = createContainer(); });

  it('handles 1000 data points', () => {
    const chart = new LineChart(container, { animate: false });
    const data = Array.from({ length: 1000 }, (_, i) => ({
      x: `Point ${i}`,
      y: Math.sin(i * 0.1) * 100 + 100,
    }));
    const start = performance.now();
    chart.setData(data, { x: 'x', y: 'y' });
    const elapsed = performance.now() - start;
    // Should complete in under 500ms even with mocked canvas
    expect(elapsed).toBeLessThan(500);
    expect(chart.resolved.labels.length).toBe(1000);
    chart.destroy();
  });

  it('handles 500 scatter points', async () => {
    const { ScatterChart } = await import('../../src/charts/scatter');
    const chart = new ScatterChart(container, { animate: false });
    const data = Array.from({ length: 500 }, (_, i) => ({
      x: Math.random() * 1000,
      y: Math.random() * 1000,
      group: i % 3 === 0 ? 'A' : i % 3 === 1 ? 'B' : 'C',
    }));
    chart.setData(data, { x: 'x', y: 'y', groupField: 'group' });
    expect(Object.keys(chart.scatterData!).length).toBe(3);
    chart.destroy();
  });

  it('handles 20 treemap items', () => {
    const chart = new TreemapChart(container, { animate: false });
    const data = Array.from({ length: 20 }, (_, i) => ({
      name: `Item ${i}`,
      value: Math.random() * 1000,
    }));
    chart.setData(data, { labelField: 'name', valueField: 'value' });
    chart.destroy();
  });
});

describe('Integration: Edge cases', () => {
  let container: HTMLDivElement;
  beforeEach(() => { container = createContainer(); });

  it('all zeros in bar chart', () => {
    const chart = new BarChart(container, { animate: false });
    chart.setData([
      { x: 'A', y: 0 }, { x: 'B', y: 0 }, { x: 'C', y: 0 },
    ], { x: 'x', y: 'y' });
    chart.destroy();
  });

  it('all same values in line chart', () => {
    const chart = new LineChart(container, { animate: false });
    chart.setData([
      { x: 'A', y: 42 }, { x: 'B', y: 42 }, { x: 'C', y: 42 },
    ], { x: 'x', y: 'y' });
    chart.destroy();
  });

  it('very large values', () => {
    const chart = new BarChart(container, { animate: false });
    chart.setData([
      { x: 'A', y: 999_999_999_999 },
      { x: 'B', y: 1_000_000_000_000 },
    ], { x: 'x', y: 'y' });
    chart.destroy();
  });

  it('negative-only values in bar chart', () => {
    const chart = new BarChart(container, { animate: false });
    chart.setData([
      { x: 'A', y: -100 }, { x: 'B', y: -200 },
    ], { x: 'x', y: 'y' });
    chart.destroy();
  });

  it('single item pie chart', () => {
    const chart = new PieChart(container, { animate: false });
    chart.setData([{ name: 'Only', value: 100 }], { labelField: 'name', valueField: 'value' });
    chart.destroy();
  });

  it('stacked area with zeroes', () => {
    const chart = new StackedAreaChart(container, { animate: false });
    chart.setData([
      { x: 'A', a: 0, b: 0 },
      { x: 'B', a: 10, b: 0 },
    ], { x: 'x', y: ['a', 'b'] });
    chart.destroy();
  });

  it('waterfall with all positive', () => {
    const chart = new WaterfallChart(container, { animate: false });
    chart.setData([
      { label: 'A', value: 100 },
      { label: 'B', value: 200 },
      { label: 'C', value: 50 },
    ], { labelField: 'label', valueField: 'value' });
    chart.destroy();
  });

  it('sparkline with single value', () => {
    const chart = new Sparkline(container, { animate: false });
    chart.setData([42]);
    chart.destroy();
  });

  it('sparkline with two equal values', () => {
    const chart = new Sparkline(container, { animate: false });
    chart.setData([100, 100]);
    chart.destroy();
  });
});

describe('Integration: formatValue across charts', () => {
  let container: HTMLDivElement;
  beforeEach(() => { container = createContainer(); });

  it('applies formatValue to bar chart', () => {
    const fmt = vi.fn((v: number) => `$${v}`);
    const chart = new BarChart(container, { animate: false, formatValue: fmt });
    chart.setData([{ x: 'A', y: 100 }], { x: 'x', y: 'y' });
    // formatValue should have been called during grid drawing
    expect(fmt).toHaveBeenCalled();
    chart.destroy();
  });

  it('applies formatValue to line chart', () => {
    const fmt = vi.fn((v: number) => `${v}%`);
    const chart = new LineChart(container, { animate: false, formatValue: fmt });
    chart.setData([{ x: 'A', y: 50 }], { x: 'x', y: 'y' });
    expect(fmt).toHaveBeenCalled();
    chart.destroy();
  });
});

describe('Integration: shortNum edge cases', () => {
  it('all magnitude boundaries', () => {
    expect(shortNum(999)).toBe('999');
    expect(shortNum(1000)).toBe('1.0K');
    expect(shortNum(999_999)).toBe('1000.0K');
    expect(shortNum(1_000_000)).toBe('1.0M');
    expect(shortNum(1_000_000_000)).toBe('1.0B');
  });
});

describe('Integration: niceScale edge cases', () => {
  it('very small range', () => {
    const s = niceScale(0.001, 0.002);
    expect(s.step).toBeGreaterThan(0);
    expect(s.max).toBeGreaterThanOrEqual(0.002);
  });

  it('negative to positive', () => {
    const s = niceScale(-50, 50);
    expect(s.min).toBeLessThanOrEqual(-50);
    expect(s.max).toBeGreaterThanOrEqual(50);
  });
});
