import { describe, it, expect, vi } from 'vitest';
import { LineChart } from '../../src/charts/line';
import { ScatterChart } from '../../src/charts/scatter';
import { StackedAreaChart } from '../../src/charts/stacked-area';
import * as lttb from '../../src/perf/lttb';

vi.mock('../../src/perf/lttb', async (importOriginal) => {
  const mod = await importOriginal<typeof import('../../src/perf/lttb')>();
  return { ...mod, lttbIndices: vi.fn(mod.lttbIndices) };
});

function createContainer(): HTMLDivElement {
  const div = document.createElement('div');
  div.style.width = '800px';
  div.style.height = '500px';
  document.body.appendChild(div);
  return div;
}

/** The call-tracking mock 2D context installed by tests/setup.ts. */
function mockCtx(chart: { ctx: unknown }): {
  calls: { method: string; args: unknown[] }[];
  getCallsFor(method: string): { method: string; args: unknown[] }[];
  resetCalls(): void;
} {
  return chart.ctx as any;
}

const N = 100_000;

describe('Large datasets (100k points) render with bounded per-frame work', () => {
  it('LineChart: a redraw stays bounded by plot width, not dataset size', () => {
    const chart = new LineChart(createContainer(), { animate: false });
    const data = Array.from({ length: N }, (_, i) => ({
      x: `P${i}`,
      y: Math.sin(i * 0.0005) * 100,
    }));
    chart.setData(data, { x: 'x', y: 'y' });

    const ctx = mockCtx(chart);
    ctx.resetCalls();
    chart._draw();

    // Downsampling caps points at ~2/px of plot width (< 600px container),
    // so a frame is a few thousand ops — not hundreds of thousands. Before
    // the fix, x-axis tick marks alone contributed 100k stroke() calls.
    expect(ctx.calls.length).toBeLessThan(20_000);
    expect(ctx.getCallsFor('stroke').length).toBeLessThan(2_000);
    chart.destroy();
  });

  it('LineChart: LTTB runs once per data/layout change, not per frame', () => {
    const chart = new LineChart(createContainer(), { animate: false });
    const data = Array.from({ length: N }, (_, i) => ({ x: `P${i}`, y: i % 97 }));
    chart.setData(data, { x: 'x', y: 'y' });

    const spy = lttb.lttbIndices as ReturnType<typeof vi.fn>;
    const callsAfterSetData = spy.mock.calls.length;
    expect(callsAfterSetData).toBeGreaterThan(0);

    // Hover-style redraws must reuse the cached downsample indices.
    for (let i = 0; i < 10; i++) chart._draw();
    expect(spy.mock.calls.length).toBe(callsAfterSetData);

    // New data invalidates the cache.
    chart.setData(data.slice(0, 50_000), { x: 'x', y: 'y' });
    expect(spy.mock.calls.length).toBeGreaterThan(callsAfterSetData);
    chart.destroy();
  });

  it('StackedAreaChart: layers are downsampled with shared indices', () => {
    const chart = new StackedAreaChart(createContainer(), { animate: false });
    const data = Array.from({ length: N }, (_, i) => ({
      x: `P${i}`,
      a: Math.abs(Math.sin(i * 0.001)) * 50,
      b: Math.abs(Math.cos(i * 0.001)) * 50,
    }));
    chart.setData(data, { x: 'x', y: ['a', 'b'] });

    const ctx = mockCtx(chart);
    ctx.resetCalls();
    chart._draw();

    // Each layer draws top + bottom edges of ≤ ~2×plot-width vertices.
    // Before the fix this was 100k lineTo calls per layer per frame.
    expect(ctx.getCallsFor('lineTo').length).toBeLessThan(15_000);
    expect(ctx.calls.length).toBeLessThan(30_000);
    chart.destroy();
  });

  it('ScatterChart: hover redraw blits a cached layer instead of re-stamping every point', () => {
    const chart = new ScatterChart(createContainer(), { animate: false });
    const data = Array.from({ length: N }, (_, i) => ({
      x: (i * 7919) % 1000,
      y: (i * 104729) % 1000,
      group: i % 3 === 0 ? 'A' : 'B',
    }));
    chart.setData(data, { x: 'x', y: 'y', groupField: 'group' });

    // First settled draw builds the offscreen layer.
    chart._draw();

    const ctx = mockCtx(chart);
    ctx.resetCalls();
    chart._onMouse(new MouseEvent('mousemove', { clientX: 300, clientY: 200 }));

    // The redraw composites one bitmap + a hover highlight — per-point work
    // (arc or drawImage per datum) must not reappear on mousemove.
    expect(ctx.getCallsFor('drawImage').length).toBeLessThan(5);
    expect(ctx.getCallsFor('arc').length).toBeLessThan(50);
    expect(ctx.calls.length).toBeLessThan(1_000);
    chart.destroy();
  });

  it('ScatterChart: hover hit-testing does not rebuild the quadtree per mousemove', () => {
    const chart = new ScatterChart(createContainer(), { animate: false });
    const data = Array.from({ length: 50_000 }, (_, i) => ({
      x: (i * 13) % 1000,
      y: (i * 31) % 1000,
    }));
    chart.setData(data, { x: 'x', y: 'y' });
    chart._draw();

    // Warm up (builds layout + quadtree once).
    chart._onMouse(new MouseEvent('mousemove', { clientX: 100, clientY: 100 }));

    const start = performance.now();
    for (let i = 0; i < 50; i++) {
      chart._onMouse(new MouseEvent('mousemove', {
        clientX: 60 + (i % 20) * 25,
        clientY: 60 + (i % 15) * 20,
      }));
    }
    const perMove = (performance.now() - start) / 50;

    // A cached-quadtree lookup + layer blit is well under a frame budget.
    // A per-move O(n) rebuild of a 50k-point quadtree would blow far past this.
    expect(perMove).toBeLessThan(8);
    chart.destroy();
  });
});
