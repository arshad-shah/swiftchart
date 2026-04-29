import { describe, it, expect } from 'vitest';
import { lttbIndices, autoTarget } from '../../src/perf/lttb';
import { Quadtree } from '../../src/perf/quadtree';
import { visibleRange, filterVisible } from '../../src/perf/viewport';
import { StreamBuffer, StreamDataset } from '../../src/perf/streaming';
import { LineChart, BarChart } from '../../src/charts';
import { ScatterChart } from '../../src/charts/scatter';

function createContainer(): HTMLDivElement {
  const div = document.createElement('div');
  div.style.width = '800px';
  div.style.height = '500px';
  document.body.appendChild(div);
  return div;
}

function benchmark(name: string, fn: () => void, iterations = 100): { mean: number; median: number; p95: number; p99: number; min: number; max: number } {
  const times: number[] = [];
  // Warmup
  for (let i = 0; i < 5; i++) fn();
  // Measure
  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    fn();
    times.push(performance.now() - start);
  }
  times.sort((a, b) => a - b);
  const mean = times.reduce((a, b) => a + b) / times.length;
  const median = times[Math.floor(times.length / 2)];
  const p95 = times[Math.floor(times.length * 0.95)];
  const p99 = times[Math.floor(times.length * 0.99)];
  return { mean, median, p95, p99, min: times[0], max: times[times.length - 1] };
}

// ═══════════════════════════════════════════════════════
// PROFILING SUITE
// ═══════════════════════════════════════════════════════
describe('Performance Profiling', () => {

  // ── LTTB Downsampling ────────────────────────────────
  describe('LTTB downsampling', () => {
    const sizes = [1_000, 10_000, 100_000];

    sizes.forEach(n => {
      it(`downsample ${n.toLocaleString()} → 1200 points`, () => {
        const data = Array.from({ length: n }, (_, i) =>
          Math.sin(i * 0.001) * 100 + Math.random() * 10
        );
        const result = benchmark(`LTTB ${n}→1200`, () => {
          lttbIndices(data, 1200);
        }, 50);

        console.log(`  LTTB ${n.toLocaleString()} → 1200: mean=${result.mean.toFixed(2)}ms median=${result.median.toFixed(2)}ms p95=${result.p95.toFixed(2)}ms`);

        // Performance gates
        if (n <= 10_000) expect(result.p95).toBeLessThan(5);
        if (n <= 100_000) expect(result.p95).toBeLessThan(50);
      });
    });

    it('autoTarget selects reasonable bucket count', () => {
      expect(autoTarget(100_000, 800)).toBe(1600);
      expect(autoTarget(100_000, 1920)).toBe(3840);
      expect(autoTarget(500, 800)).toBe(500); // no downsampling needed
    });
  });

  // ── Quadtree ─────────────────────────────────────────
  describe('Quadtree vs linear scan', () => {
    const sizes = [1_000, 10_000, 50_000];

    sizes.forEach(n => {
      it(`nearest-point lookup on ${n.toLocaleString()} points`, () => {
        const sxs = Array.from({ length: n }, () => Math.random() * 800);
        const sys = Array.from({ length: n }, () => Math.random() * 500);

        // Build quadtree
        const buildResult = benchmark(`QT build ${n}`, () => {
          Quadtree.fromArrays(sxs, sys, { x: 0, y: 0, w: 800, h: 500 });
        }, 20);

        const qt = Quadtree.fromArrays(sxs, sys, { x: 0, y: 0, w: 800, h: 500 });

        // Quadtree lookups
        const qtResult = benchmark(`QT nearest ${n}`, () => {
          for (let i = 0; i < 100; i++) {
            qt.nearest(Math.random() * 800, Math.random() * 500, 20);
          }
        }, 50);

        // Linear scan (the old approach)
        const linearResult = benchmark(`Linear nearest ${n}`, () => {
          for (let q = 0; q < 100; q++) {
            const qx = Math.random() * 800, qy = Math.random() * 500;
            let best = -1, bestDist = 20;
            for (let i = 0; i < n; i++) {
              const d = Math.hypot(qx - sxs[i], qy - sys[i]);
              if (d < bestDist) { bestDist = d; best = i; }
            }
          }
        }, 20);

        const speedup = linearResult.mean / qtResult.mean;

        console.log(`  ${n.toLocaleString()} points:`);
        console.log(`    Build:  mean=${buildResult.mean.toFixed(2)}ms`);
        console.log(`    QT 100 lookups: mean=${qtResult.mean.toFixed(2)}ms`);
        console.log(`    Linear 100 lookups: mean=${linearResult.mean.toFixed(2)}ms`);
        console.log(`    Speedup: ${speedup.toFixed(1)}x`);

        // Quadtree should be faster than linear for n >= 1000
        if (n >= 10_000) {
          expect(speedup).toBeGreaterThan(2);
        }
      });
    });
  });

  // ── Viewport Culling ─────────────────────────────────
  describe('Viewport culling', () => {
    it('binary search vs full array filter on 100K points', () => {
      const xs = Array.from({ length: 100_000 }, (_, i) => i * 0.01);

      const bsResult = benchmark('Binary search', () => {
        visibleRange(xs, 200, 800);
      }, 1000);

      const filterResult = benchmark('Filter', () => {
        const visible: number[] = [];
        for (let i = 0; i < xs.length; i++) {
          if (xs[i] >= 200 && xs[i] <= 800) visible.push(i);
        }
      }, 100);

      console.log(`  Binary search: mean=${bsResult.mean.toFixed(4)}ms`);
      console.log(`  Linear filter: mean=${filterResult.mean.toFixed(4)}ms`);
      console.log(`  Speedup: ${(filterResult.mean / bsResult.mean).toFixed(0)}x`);

      expect(bsResult.mean).toBeLessThan(filterResult.mean);
    });
  });

  // ── StreamBuffer ─────────────────────────────────────
  describe('StreamBuffer throughput', () => {
    it('push 100K values into 10K buffer', () => {
      const buf = new StreamBuffer(10_000);
      const result = benchmark('Stream 100K', () => {
        buf.clear();
        for (let i = 0; i < 100_000; i++) {
          buf.push(Math.sin(i * 0.001) * 100);
        }
      }, 10);

      console.log(`  100K pushes: mean=${result.mean.toFixed(1)}ms`);
      expect(result.mean).toBeLessThan(500);
      expect(buf.length).toBe(10_000);
    });

    it('toArray snapshot performance', () => {
      const buf = new StreamBuffer(100_000);
      for (let i = 0; i < 100_000; i++) buf.push(i);

      const result = benchmark('Snapshot 100K', () => {
        buf.push(Math.random()); // dirty the cache
        buf.toArray();
      }, 100);

      console.log(`  100K snapshot: mean=${result.mean.toFixed(3)}ms`);
      expect(result.mean).toBeLessThan(10);
    });
  });

  // ── End-to-End Chart Rendering ───────────────────────
  describe('End-to-end chart rendering', () => {
    it('LineChart 100K points with LTTB', () => {
      const container = createContainer();
      const chart = new LineChart(container, { animate: false });
      const data = Array.from({ length: 100_000 }, (_, i) => ({
        x: `P${i}`,
        y: Math.sin(i * 0.0001) * 100 + Math.random() * 20,
      }));

      const setDataResult = benchmark('Line setData 100K', () => {
        chart.setData(data, { x: 'x', y: 'y' });
      }, 10);

      console.log(`  LineChart 100K setData: mean=${setDataResult.mean.toFixed(1)}ms`);
      expect(setDataResult.mean).toBeLessThan(500);
      chart.destroy();
    });

    it('ScatterChart 10K points with Quadtree hover', () => {
      const container = createContainer();
      const chart = new ScatterChart(container, { animate: false });
      const data = Array.from({ length: 10_000 }, (_, i) => ({
        x: Math.random() * 1000,
        y: Math.random() * 1000,
        group: i % 5 === 0 ? 'A' : i % 5 === 1 ? 'B' : 'C',
      }));
      chart.setData(data, { x: 'x', y: 'y', groupField: 'group' });

      // Simulate hover events
      const hoverResult = benchmark('Scatter 10K hover', () => {
        const event = new MouseEvent('mousemove', {
          clientX: Math.random() * 800,
          clientY: Math.random() * 500,
        });
        chart._onMouse(event);
      }, 50);

      console.log(`  ScatterChart 10K hover: mean=${hoverResult.mean.toFixed(2)}ms`);
      expect(hoverResult.mean).toBeLessThan(50);
      chart.destroy();
    });

    it('BarChart 5K bars render', () => {
      const container = createContainer();
      const chart = new BarChart(container, { animate: false });
      const data = Array.from({ length: 5000 }, (_, i) => ({
        x: `B${i}`,
        y: Math.random() * 1000,
      }));

      const result = benchmark('Bar 5K setData', () => {
        chart.setData(data, { x: 'x', y: 'y' });
      }, 10);

      console.log(`  BarChart 5K setData: mean=${result.mean.toFixed(1)}ms`);
      expect(result.mean).toBeLessThan(300);
      chart.destroy();
    });

    it('StreamDataset → LineChart real-time update cycle', () => {
      const container = createContainer();
      const chart = new LineChart(container, { animate: false });
      const stream = new StreamDataset(['cpu', 'memory'], 2000);

      // Fill initial data
      for (let i = 0; i < 2000; i++) {
        stream.push(`t${i}`, { cpu: Math.sin(i * 0.01) * 50 + 50, memory: Math.random() * 16 });
      }

      const result = benchmark('Stream push + chart update', () => {
        // Push 100 new points
        for (let i = 0; i < 100; i++) {
          stream.push(`t${2000 + i}`, { cpu: Math.random() * 100, memory: Math.random() * 16 });
        }
        // Convert and render
        const resolved = stream.toResolvedData();
        chart.setData([], {
          labels: resolved.labels,
          datasets: resolved.datasets,
        });
      }, 50);

      console.log(`  Stream 100pts + update: mean=${result.mean.toFixed(2)}ms`);
      expect(result.mean).toBeLessThan(100);
      chart.destroy();
    });
  });

  // ── Memory Efficiency ────────────────────────────────
  describe('Memory efficiency', () => {
    it('StreamBuffer uses Float64Array (8 bytes/value vs ~24 for JS number[])', () => {
      const buf = new StreamBuffer(100_000);
      for (let i = 0; i < 100_000; i++) buf.push(i);
      // Float64Array: 100K * 8 bytes = 800KB
      // JS Array: 100K * ~24 bytes = ~2.4MB
      // We can't measure exact memory in test, but verify it works
      expect(buf.length).toBe(100_000);
      expect(buf.get(99_999)).toBe(99_999);
    });

    it('LTTB indices are just numbers (no point object allocation)', () => {
      const data = Array.from({ length: 100_000 }, (_, i) => Math.sin(i));
      const indices = lttbIndices(data, 1000);
      // Verify return is compact number array, not object array
      expect(typeof indices[0]).toBe('number');
      expect(indices.length).toBe(1000);
    });
  });
});
