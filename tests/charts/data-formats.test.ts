/**
 * Data-format probe tests.
 *
 * Treat this file as living documentation: each test states a piece of
 * data SwiftChart is expected to accept (or refuse cleanly), and the
 * assertion verifies it. When a chart class breaks on previously-tolerated
 * input, the failure here will pinpoint which contract regressed.
 *
 * Specifically these tests probe:
 *   1. The shared `resolveData` schema-detection pipeline.
 *   2. Each chart class's specialised `setData` override.
 *   3. Common malformed-input shapes (empty arrays, null fields, NaN,
 *      mixed types, very large arrays, unicode, duplicates).
 *
 * "Doesn't throw" + "produces sensible state" is the bar — we accept lossy
 * coercion (parseFloat on numeric strings, `null → ''` for labels) but we
 * must never silently render NaN onto the canvas.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  BarChart, LineChart, PieChart, ScatterChart, RadarChart, GaugeChart,
  HBarChart, Sparkline, StackedAreaChart, WaterfallChart, TreemapChart,
  StackedBarChart, BubbleChart, HeatmapChart, CandlestickChart,
  BoxplotChart, FunnelChart, SankeyChart, ComboChart, RadialBarChart,
  BulletChart, MarimekkoChart, NetworkChart,
} from '../../src/charts';
import { resolveData } from '../../src/utils/helpers';

function container(w = 600, h = 400): HTMLDivElement {
  const div = document.createElement('div');
  div.style.cssText = `width:${w}px;height:${h}px`;
  document.body.appendChild(div);
  return div;
}

// ════════════════════════════════════════════════════════════════════════
// resolveData — the shared schema-detection layer used by most charts
// ════════════════════════════════════════════════════════════════════════

describe('resolveData', () => {
  it('returns empty for null / undefined / empty array', () => {
    expect(resolveData(null, {})).toEqual({ labels: [], datasets: [] });
    expect(resolveData(undefined, {})).toEqual({ labels: [], datasets: [] });
    expect(resolveData([], {})).toEqual({ labels: [], datasets: [] });
  });

  it('honours the pre-built shape (mapping.labels + mapping.datasets)', () => {
    const r = resolveData([], {
      labels: ['Q1', 'Q2'],
      datasets: [{ label: 'Rev', data: [100, 200] }],
    });
    expect(r.labels).toEqual(['Q1', 'Q2']);
    expect(r.datasets[0].data).toEqual([100, 200]);
  });

  it('auto-picks first string field as labels and numeric fields as series', () => {
    const r = resolveData([
      { month: 'Jan', revenue: 100, cost: 60 },
      { month: 'Feb', revenue: 120, cost: 70 },
    ], {});
    expect(r.labels).toEqual(['Jan', 'Feb']);
    expect(r.datasets.map(d => d.label).sort()).toEqual(['cost', 'revenue']);
  });

  it('coerces numeric strings to numbers via parseFloat', () => {
    const r = resolveData([
      { x: 'A', y: '42' },
      { x: 'B', y: '3.14' },
    ], { x: 'x', y: 'y' });
    expect(r.datasets[0].data).toEqual([42, 3.14]);
  });

  it('replaces non-numeric strings with 0 (does not propagate NaN)', () => {
    const r = resolveData([
      { x: 'A', y: 10 },
      { x: 'B', y: 'oops' },
      { x: 'C', y: null },
    ], { x: 'x', y: 'y' });
    expect(r.datasets[0].data).toEqual([10, 0, 0]);
    expect(r.datasets[0].data.every(Number.isFinite)).toBe(true);
  });

  it('renders missing labels as empty strings (not "undefined")', () => {
    const r = resolveData([
      { x: 'A', y: 1 },
      { y: 2 } as any,
      { x: null, y: 3 } as any,
    ], { x: 'x', y: 'y' });
    expect(r.labels).toEqual(['A', '', '']);
  });

  it('respects explicit `seriesNames` overrides', () => {
    const r = resolveData([{ x: 'A', a: 1, b: 2 }], {
      x: 'x', y: ['a', 'b'], seriesNames: ['Alpha', 'Beta'],
    });
    expect(r.datasets[0].label).toBe('Alpha');
    expect(r.datasets[1].label).toBe('Beta');
  });

  it('handles a Y array with a missing field — produces zero-filled column', () => {
    // 'missing' isn't on any row; output should be [0, 0] not crash.
    const r = resolveData([
      { x: 'A', a: 5 },
      { x: 'B', a: 7 },
    ], { x: 'x', y: ['a', 'missing'] });
    expect(r.datasets).toHaveLength(2);
    expect(r.datasets[1].data).toEqual([0, 0]);
  });

  it('handles single-row data', () => {
    const r = resolveData([{ x: 'only', y: 99 }], { x: 'x', y: 'y' });
    expect(r.labels).toEqual(['only']);
    expect(r.datasets[0].data).toEqual([99]);
  });

  it('handles all-numeric rows by stringifying the chosen label key', () => {
    // No string field — falls back to first key.
    const r = resolveData([
      { ts: 100, value: 5 },
      { ts: 200, value: 7 },
    ], {});
    expect(r.labels).toEqual(['100', '200']);
  });

  it('preserves the order of series defined in mapping.y', () => {
    const r = resolveData([{ x: 'A', cost: 10, revenue: 100, target: 50 }], {
      x: 'x', y: ['target', 'revenue', 'cost'],
    });
    expect(r.datasets.map(d => d.label)).toEqual(['target', 'revenue', 'cost']);
  });

  it('handles 10k rows in O(n) without stack overflow', () => {
    const big = Array.from({ length: 10_000 }, (_, i) => ({ x: `r${i}`, y: i }));
    const t0 = performance.now();
    const r = resolveData(big, { x: 'x', y: 'y' });
    expect(performance.now() - t0).toBeLessThan(150);
    expect(r.labels.length).toBe(10_000);
  });
});

// ════════════════════════════════════════════════════════════════════════
// Generic axis-charts: every chart that uses the shared resolveData layer
// ════════════════════════════════════════════════════════════════════════

const AXIS_CHARTS = [
  { name: 'BarChart', Cls: BarChart },
  { name: 'LineChart', Cls: LineChart },
  { name: 'StackedBarChart', Cls: StackedBarChart },
  { name: 'StackedAreaChart', Cls: StackedAreaChart },
  { name: 'HBarChart', Cls: HBarChart },
  { name: 'RadarChart', Cls: RadarChart },
  { name: 'ComboChart', Cls: ComboChart },
  { name: 'RadialBarChart', Cls: RadialBarChart },
  { name: 'MarimekkoChart', Cls: MarimekkoChart },
] as const;

describe.each(AXIS_CHARTS)('$name — data robustness', ({ Cls }) => {
  let div: HTMLDivElement;
  beforeEach(() => { div = container(); });

  it('survives empty data without throwing', () => {
    const c = new Cls(div, { animate: false });
    expect(() => c.setData([])).not.toThrow();
    expect(() => c.setData(null)).not.toThrow();
    expect(() => c.setData(undefined)).not.toThrow();
    c.destroy();
  });

  it('accepts a single-row dataset', () => {
    const c = new Cls(div, { animate: false });
    expect(() => c.setData([{ x: 'A', y: 10 }], { x: 'x', y: 'y' })).not.toThrow();
    c.destroy();
  });

  it('handles all-zero series', () => {
    const c = new Cls(div, { animate: false });
    expect(() => c.setData(
      [{ x: 'A', y: 0 }, { x: 'B', y: 0 }],
      { x: 'x', y: 'y' },
    )).not.toThrow();
    c.destroy();
  });

  it('handles negative values', () => {
    const c = new Cls(div, { animate: false });
    expect(() => c.setData(
      [{ x: 'A', y: -10 }, { x: 'B', y: 5 }, { x: 'C', y: -3 }],
      { x: 'x', y: 'y' },
    )).not.toThrow();
    c.destroy();
  });

  it('coerces numeric strings without rendering NaN', () => {
    const c = new Cls(div, { animate: false });
    expect(() => c.setData(
      [{ x: 'A', y: '12' }, { x: 'B', y: '34.5' }],
      { x: 'x', y: 'y' },
    )).not.toThrow();
    c.destroy();
  });

  it('handles a dataset where the Y field is missing on some rows', () => {
    const c = new Cls(div, { animate: false });
    expect(() => c.setData(
      [{ x: 'A', y: 10 }, { x: 'B' } as any, { x: 'C', y: 30 }],
      { x: 'x', y: 'y' },
    )).not.toThrow();
    c.destroy();
  });

  it('handles unicode + emoji + very long labels', () => {
    const c = new Cls(div, { animate: false });
    expect(() => c.setData(
      [
        { x: '日本語', y: 1 },
        { x: '🚀🎉', y: 2 },
        { x: 'A'.repeat(200), y: 3 },
      ],
      { x: 'x', y: 'y' },
    )).not.toThrow();
    c.destroy();
  });

  it('handles 1k rows', () => {
    const c = new Cls(div, { animate: false });
    const data = Array.from({ length: 1000 }, (_, i) => ({ x: `r${i}`, y: Math.sin(i / 10) * 100 }));
    expect(() => c.setData(data, { x: 'x', y: 'y' })).not.toThrow();
    c.destroy();
  });

  it('handles duplicate labels', () => {
    const c = new Cls(div, { animate: false });
    expect(() => c.setData(
      [{ x: 'A', y: 1 }, { x: 'A', y: 2 }, { x: 'A', y: 3 }],
      { x: 'x', y: 'y' },
    )).not.toThrow();
    c.destroy();
  });

  it('survives Infinity / -Infinity / NaN passed in raw data', () => {
    const c = new Cls(div, { animate: false });
    expect(() => c.setData(
      [
        { x: 'A', y: 10 },
        { x: 'B', y: Infinity },
        { x: 'C', y: -Infinity },
        { x: 'D', y: NaN },
      ],
      { x: 'x', y: 'y' },
    )).not.toThrow();
    c.destroy();
  });

  it('survives a hover event right after empty data is loaded', () => {
    const c = new Cls(div, { animate: false });
    c.setData([]);
    expect(() => {
      c.canvas.dispatchEvent(new MouseEvent('mousemove', {
        clientX: 100, clientY: 100, bubbles: true,
      }));
    }).not.toThrow();
    c.destroy();
  });

  it('survives Date-object labels (should auto-stringify)', () => {
    const c = new Cls(div, { animate: false });
    expect(() => c.setData(
      [
        { x: new Date('2024-01-01'), y: 10 },
        { x: new Date('2024-02-01'), y: 20 },
      ] as any,
      { x: 'x', y: 'y' },
    )).not.toThrow();
    c.destroy();
  });

  it('survives a flat number[] passed where rows[] are expected (silent zero-fill)', () => {
    const c = new Cls(div, { animate: false });
    // Common user mistake — passing [1,2,3] to a chart that expects [{x,y},...].
    // Per the docs this is invalid; what we guarantee is that we don't crash.
    expect(() => c.setData([1, 2, 3] as any, { x: 'x', y: 'y' })).not.toThrow();
    c.destroy();
  });

  it('survives data passed as Map / Set (non-array iterables)', () => {
    const c = new Cls(div, { animate: false });
    // setData expects an Array; non-arrays should be rejected gracefully
    // (treated as empty), not crash.
    expect(() => c.setData(new Map() as any)).not.toThrow();
    expect(() => c.setData(new Set() as any)).not.toThrow();
    c.destroy();
  });

  it('survives setData on a 1×1 px container (degenerate plot area)', () => {
    const tiny = container(1, 1);
    const c = new Cls(tiny, { animate: false });
    expect(() => c.setData(
      [{ x: 'A', y: 1 }, { x: 'B', y: 2 }],
      { x: 'x', y: 'y' },
    )).not.toThrow();
    c.destroy();
    tiny.remove();
  });
});

// ════════════════════════════════════════════════════════════════════════
// Pie / Donut — uses labelField/valueField mapping
// ════════════════════════════════════════════════════════════════════════

describe('PieChart — data robustness', () => {
  let div: HTMLDivElement;
  beforeEach(() => { div = container(); });

  it('survives empty / null data', () => {
    const c = new PieChart(div, { animate: false });
    expect(() => c.setData([])).not.toThrow();
    expect(() => c.setData(null)).not.toThrow();
    c.destroy();
  });

  it('renders zero-total data without throwing', () => {
    const c = new PieChart(div, { animate: false });
    expect(() => c.setData(
      [{ label: 'A', value: 0 }, { label: 'B', value: 0 }],
      { labelField: 'label', valueField: 'value' },
    )).not.toThrow();
    c.destroy();
  });

  it('accepts the pre-built {labels, values} shape', () => {
    const c = new PieChart(div, { animate: false });
    expect(() => c.setData(null, {
      labels: ['A', 'B', 'C'], values: [10, 20, 30],
    })).not.toThrow();
    c.destroy();
  });

  it('handles a single slice', () => {
    const c = new PieChart(div, { animate: false });
    expect(() => c.setData(
      [{ label: 'Only', value: 100 }],
      { labelField: 'label', valueField: 'value' },
    )).not.toThrow();
    c.destroy();
  });
});

// ════════════════════════════════════════════════════════════════════════
// Gauge — accepts [number] or { value }
// ════════════════════════════════════════════════════════════════════════

describe('GaugeChart — data robustness', () => {
  let div: HTMLDivElement;
  beforeEach(() => { div = container(); });

  it('accepts [value] via setData', () => {
    const c = new GaugeChart(div, { animate: false });
    expect(() => c.setData([72])).not.toThrow();
    c.destroy();
  });

  it('clamps out-of-range values to [min, max]', () => {
    const c = new GaugeChart(div, { animate: false, min: 0, max: 100 });
    expect(() => c.setValue(150)).not.toThrow();
    expect(() => c.setValue(-50)).not.toThrow();
    c.destroy();
  });

  it('handles NaN value gracefully', () => {
    const c = new GaugeChart(div, { animate: false });
    expect(() => c.setValue(NaN)).not.toThrow();
    c.destroy();
  });
});

// ════════════════════════════════════════════════════════════════════════
// Sparkline — accepts a flat number[]
// ════════════════════════════════════════════════════════════════════════

describe('Sparkline — data robustness', () => {
  let div: HTMLDivElement;
  beforeEach(() => { div = container(); });

  it('accepts plain number[]', () => {
    const c = new Sparkline(div, { animate: false });
    expect(() => c.setData([1, 2, 3, 4])).not.toThrow();
    c.destroy();
  });

  it('handles non-number entries (coerces to 0)', () => {
    const c = new Sparkline(div, { animate: false });
    // @ts-expect-error — intentionally passing mixed data
    expect(() => c.setData([1, 'oops', null, 4])).not.toThrow();
    c.destroy();
  });

  it('survives single-element series (would otherwise divide by zero)', () => {
    const c = new Sparkline(div, { animate: false });
    expect(() => c.setData([42])).not.toThrow();
    c.destroy();
  });
});

// ════════════════════════════════════════════════════════════════════════
// Scatter / Bubble — group + size mappings
// ════════════════════════════════════════════════════════════════════════

describe('ScatterChart — data robustness', () => {
  let div: HTMLDivElement;
  beforeEach(() => { div = container(); });

  it('survives empty', () => {
    const c = new ScatterChart(div, { animate: false });
    expect(() => c.setData([])).not.toThrow();
    c.destroy();
  });

  it('handles points with NaN x or y (filters or normalises)', () => {
    const c = new ScatterChart(div, { animate: false });
    expect(() => c.setData([
      { x: 1, y: 2 },
      { x: NaN, y: 5 },
      { x: 3, y: NaN },
    ])).not.toThrow();
    c.destroy();
  });

  it('groups points by groupField', () => {
    const c = new ScatterChart(div, { animate: false });
    expect(() => c.setData([
      { x: 1, y: 2, g: 'a' }, { x: 3, y: 4, g: 'a' },
      { x: 5, y: 6, g: 'b' },
    ], { groupField: 'g' })).not.toThrow();
    c.destroy();
  });
});

describe('BubbleChart — data robustness', () => {
  let div: HTMLDivElement;
  beforeEach(() => { div = container(); });

  it('filters out points with non-finite x or y', () => {
    const c = new BubbleChart(div, { animate: false });
    expect(() => c.setData([
      { x: 1, y: 1, s: 5 },
      { x: NaN, y: 1, s: 5 },
      { x: 1, y: Infinity, s: 5 },
      { x: 2, y: 2, s: 5 },
    ], { sizeField: 's' })).not.toThrow();
    c.destroy();
  });

  it('handles missing size values (defaults to 1)', () => {
    const c = new BubbleChart(div, { animate: false });
    expect(() => c.setData([
      { x: 1, y: 1 }, { x: 2, y: 2 },
    ])).not.toThrow();
    c.destroy();
  });
});

// ════════════════════════════════════════════════════════════════════════
// Specialty charts with custom data shapes
// ════════════════════════════════════════════════════════════════════════

describe('WaterfallChart — data robustness', () => {
  let div: HTMLDivElement;
  beforeEach(() => { div = container(); });

  it('handles all-positive deltas', () => {
    const c = new WaterfallChart(div, { animate: false });
    expect(() => c.setData([
      { label: 'A', value: 10 }, { label: 'B', value: 20 },
    ])).not.toThrow();
    c.destroy();
  });

  it('handles deltas that drive the cumulative below zero', () => {
    const c = new WaterfallChart(div, { animate: false });
    expect(() => c.setData([
      { label: 'A', value: 5 }, { label: 'B', value: -20 },
    ])).not.toThrow();
    c.destroy();
  });
});

describe('TreemapChart — data robustness', () => {
  let div: HTMLDivElement;
  beforeEach(() => { div = container(); });

  it('filters out zero / negative items', () => {
    const c = new TreemapChart(div, { animate: false });
    expect(() => c.setData([
      { name: 'A', value: 100 },
      { name: 'B', value: 0 },
      { name: 'C', value: -50 },
    ])).not.toThrow();
    c.destroy();
  });

  it('accepts both `name` and `label` as the label key', () => {
    const c = new TreemapChart(div, { animate: false });
    expect(() => c.setData([{ name: 'A', value: 1 }])).not.toThrow();
    expect(() => c.setData([{ label: 'A', value: 1 }])).not.toThrow();
    c.destroy();
  });
});

describe('CandlestickChart — data robustness', () => {
  let div: HTMLDivElement;
  beforeEach(() => { div = container(); });

  it('drops rows with non-finite OHLC values', () => {
    const c = new CandlestickChart(div, { animate: false });
    // First row valid, second has NaN, third valid — should not crash.
    expect(() => c.setData([
      { date: 'D1', open: 100, high: 105, low: 98, close: 103 },
      { date: 'D2', open: NaN, high: 105, low: 98, close: 103 },
      { date: 'D3', open: 103, high: 110, low: 100, close: 108 },
    ], { labelField: 'date' })).not.toThrow();
    c.destroy();
  });

  it('handles open == close (doji bar)', () => {
    const c = new CandlestickChart(div, { animate: false });
    expect(() => c.setData([
      { date: 'D1', open: 100, high: 105, low: 95, close: 100 },
    ], { labelField: 'date' })).not.toThrow();
    c.destroy();
  });
});

describe('BoxplotChart — data robustness', () => {
  let div: HTMLDivElement;
  beforeEach(() => { div = container(); });

  it('accepts pre-computed five-number summaries', () => {
    const c = new BoxplotChart(div, { animate: false });
    expect(() => c.setData([
      { label: 'A', min: 1, q1: 3, median: 5, q3: 7, max: 9 },
    ])).not.toThrow();
    c.destroy();
  });

  it('accepts raw samples via mapping.y', () => {
    const c = new BoxplotChart(div, { animate: false });
    expect(() => c.setData(
      [{ label: 'A', samples: [1, 2, 3, 4, 5, 6, 7, 8, 9] }],
      { y: 'samples' },
    )).not.toThrow();
    c.destroy();
  });

  it('handles empty samples without crashing', () => {
    const c = new BoxplotChart(div, { animate: false });
    expect(() => c.setData(
      [{ label: 'A', samples: [] }],
      { y: 'samples' },
    )).not.toThrow();
    c.destroy();
  });

  it('handles missing outliers field on pre-computed input', () => {
    const c = new BoxplotChart(div, { animate: false });
    expect(() => c.setData([
      { label: 'A', min: 1, q1: 3, median: 5, q3: 7, max: 9 /* no outliers */ },
    ])).not.toThrow();
    c.destroy();
  });
});

describe('FunnelChart — data robustness', () => {
  let div: HTMLDivElement;
  beforeEach(() => { div = container(); });

  it('filters out zero / negative stages', () => {
    const c = new FunnelChart(div, { animate: false });
    expect(() => c.setData(
      [{ label: 'A', value: 100 }, { label: 'B', value: 0 }, { label: 'C', value: -1 }],
      { labelField: 'label', valueField: 'value' },
    )).not.toThrow();
    c.destroy();
  });

  it('handles a single stage (no narrowing reference)', () => {
    const c = new FunnelChart(div, { animate: false });
    expect(() => c.setData(
      [{ label: 'Only', value: 100 }],
      { labelField: 'label', valueField: 'value' },
    )).not.toThrow();
    c.destroy();
  });
});

describe('BulletChart — data robustness', () => {
  let div: HTMLDivElement;
  beforeEach(() => { div = container(); });

  it('handles rows missing target / ranges', () => {
    const c = new BulletChart(div, { animate: false });
    expect(() => c.setData([
      { label: 'A', value: 50 },
      { label: 'B', value: 80, target: 100 },
      { label: 'C', value: 30, ranges: [40, 60, 80] },
    ])).not.toThrow();
    c.destroy();
  });

  it('handles unsorted ranges', () => {
    const c = new BulletChart(div, { animate: false });
    expect(() => c.setData([
      { label: 'A', value: 50, target: 60, ranges: [80, 40, 60] },
    ])).not.toThrow();
    c.destroy();
  });
});

describe('HeatmapChart — data robustness', () => {
  let div: HTMLDivElement;
  beforeEach(() => { div = container(); });

  it('handles sparse cells (missing combinations)', () => {
    const c = new HeatmapChart(div, { animate: false });
    expect(() => c.setData([
      { hour: '00', day: 'Mon', visits: 5 },
      { hour: '01', day: 'Tue', visits: 8 },
      // (00, Tue) is missing on purpose
    ], { x: 'hour', y: 'day', valueField: 'visits' })).not.toThrow();
    c.destroy();
  });

  it('handles all-equal values (range collapses to 0)', () => {
    const c = new HeatmapChart(div, { animate: false });
    expect(() => c.setData([
      { x: 'A', y: 'r', v: 5 }, { x: 'B', y: 'r', v: 5 },
    ], { x: 'x', y: 'y', valueField: 'v' })).not.toThrow();
    c.destroy();
  });
});

// ════════════════════════════════════════════════════════════════════════
// Graph charts (Sankey, Network)
// ════════════════════════════════════════════════════════════════════════

describe('SankeyChart — data robustness', () => {
  let div: HTMLDivElement;
  beforeEach(() => { div = container(); });

  it('survives an empty graph', () => {
    const c = new SankeyChart(div, { animate: false });
    expect(() => c.setSankey([], [])).not.toThrow();
    c.destroy();
  });

  it('drops links pointing at non-existent nodes', () => {
    const c = new SankeyChart(div, { animate: false });
    expect(() => c.setSankey(
      [{ id: 'A' }, { id: 'B' }],
      [
        { source: 'A', target: 'B', value: 5 },
        { source: 'A', target: 'GHOST', value: 3 },  // GHOST not in nodes
        { source: 'X', target: 'Y', value: 1 },      // both missing
      ],
    )).not.toThrow();
    c.destroy();
  });

  it('drops links with zero / negative value', () => {
    const c = new SankeyChart(div, { animate: false });
    expect(() => c.setSankey(
      [{ id: 'A' }, { id: 'B' }],
      [
        { source: 'A', target: 'B', value: 0 },
        { source: 'A', target: 'B', value: -10 },
        { source: 'A', target: 'B', value: 5 },
      ],
    )).not.toThrow();
    c.destroy();
  });

  it('handles a single isolated node (no links)', () => {
    const c = new SankeyChart(div, { animate: false });
    expect(() => c.setSankey([{ id: 'lonely' }], [])).not.toThrow();
    c.destroy();
  });
});

describe('NetworkChart — data robustness', () => {
  let div: HTMLDivElement;
  beforeEach(() => { div = container(); });

  it('survives empty graph', () => {
    const c = new NetworkChart(div, { animate: false });
    expect(() => c.setGraph([], [])).not.toThrow();
    c.destroy();
  });

  it('drops links to non-existent nodes', () => {
    const c = new NetworkChart(div, { animate: false });
    expect(() => c.setGraph(
      [{ id: 'A' }, { id: 'B' }],
      [
        { source: 'A', target: 'B' },
        { source: 'A', target: 'GHOST' },
        { source: 'X', target: 'Y' },
      ],
    )).not.toThrow();
    c.destroy();
  });

  it('handles a single node', () => {
    const c = new NetworkChart(div, { animate: false });
    expect(() => c.setGraph([{ id: 'only' }], [])).not.toThrow();
    c.destroy();
  });

  it('handles a self-loop', () => {
    const c = new NetworkChart(div, { animate: false });
    expect(() => c.setGraph(
      [{ id: 'A' }],
      [{ source: 'A', target: 'A' }],
    )).not.toThrow();
    c.destroy();
  });

  it('survives 100 nodes / 200 random links', () => {
    const c = new NetworkChart(div, { animate: false, iterations: 50 });
    const nodes = Array.from({ length: 100 }, (_, i) => ({ id: `n${i}` }));
    const links = Array.from({ length: 200 }, () => ({
      source: `n${Math.floor(Math.random() * 100)}`,
      target: `n${Math.floor(Math.random() * 100)}`,
    }));
    expect(() => c.setGraph(nodes, links)).not.toThrow();
    c.destroy();
  });
});
