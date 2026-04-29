/**
 * Algorithm correctness tests — property-based / cross-check style.
 *
 * Each algorithm is validated against a reference implementation
 * (or known invariants) on randomised inputs. Seeded RNG keeps it
 * deterministic.
 */
import { describe, it, expect } from 'vitest';
import {
  lttbIndices, lttbDownsampleXY, autoTarget,
  Quadtree, type QTPoint,
  visibleRange, visibleBarRange, isVisible,
  StreamBuffer, StreamDataset,
  niceScale, niceNum, arrayMin, arrayMax, arraysExtent, clamp, lerp,
} from '../../src';

// ── Seeded mulberry32 RNG ──────────────────────────────
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ─────────────────────────────────────────────────────────
//  LTTB
// ─────────────────────────────────────────────────────────
describe('LTTB algorithm — invariants', () => {
  it('preserves first and last index exactly', () => {
    const r = rng(1);
    for (let trial = 0; trial < 20; trial++) {
      const n = 200 + Math.floor(r() * 800);
      const target = 10 + Math.floor(r() * 200);
      const data = Array.from({ length: n }, () => r() * 100);
      const idx = lttbIndices(data, target);
      expect(idx[0]).toBe(0);
      if (n > target && target >= 3) expect(idx[idx.length - 1]).toBe(n - 1);
    }
  });

  it('produces strictly monotonic indices', () => {
    const r = rng(2);
    for (let trial = 0; trial < 20; trial++) {
      const n = 500 + Math.floor(r() * 500);
      const target = 5 + Math.floor(r() * 100);
      const data = Array.from({ length: n }, (_, i) => Math.sin(i / 10) * 50 + r() * 5);
      const idx = lttbIndices(data, target);
      for (let i = 1; i < idx.length; i++) {
        expect(idx[i]).toBeGreaterThan(idx[i - 1]);
      }
      // All indices in range.
      for (const i of idx) {
        expect(i).toBeGreaterThanOrEqual(0);
        expect(i).toBeLessThan(n);
      }
    }
  });

  it('returns identity when target >= length or target < 3', () => {
    const data = [1, 2, 3, 4, 5];
    expect(lttbIndices(data, 5)).toEqual([0, 1, 2, 3, 4]);
    expect(lttbIndices(data, 10)).toEqual([0, 1, 2, 3, 4]);
    expect(lttbIndices(data, 2)).toEqual([0, 1, 2, 3, 4]); // target < 3 → identity
  });

  it('output length equals target when target < n and target >= 3', () => {
    const data = Array.from({ length: 1000 }, (_, i) => i);
    expect(lttbIndices(data, 100).length).toBe(100);
    expect(lttbIndices(data, 50).length).toBe(50);
    expect(lttbIndices(data, 3).length).toBe(3);
  });

  it('XY variant: arrays match indices and have target length', () => {
    const r = rng(3);
    const xs = Array.from({ length: 500 }, (_, i) => i);
    const ys = Array.from({ length: 500 }, () => r() * 100);
    const out = lttbDownsampleXY(xs, ys, 50);
    expect(out.indices.length).toBe(50);
    expect(out.xs.length).toBe(50);
    expect(out.ys.length).toBe(50);
    for (let i = 0; i < out.indices.length; i++) {
      expect(out.xs[i]).toBe(xs[out.indices[i]]);
      expect(out.ys[i]).toBe(ys[out.indices[i]]);
    }
  });

  it('autoTarget never exceeds dataLength and never returns < 3', () => {
    expect(autoTarget(10, 100)).toBe(10);
    expect(autoTarget(1000, 100)).toBe(200); // 100*2 ppx
    expect(autoTarget(0, 100)).toBe(0);
    expect(autoTarget(2, 100)).toBe(2);
    expect(autoTarget(1, 100)).toBe(1);
    // Tiny pixel widths still return ≥ 3.
    expect(autoTarget(1000, 1)).toBeGreaterThanOrEqual(3);
  });
});

// ─────────────────────────────────────────────────────────
//  Quadtree
// ─────────────────────────────────────────────────────────
describe('Quadtree — cross-check vs linear scan', () => {
  function linearNearest(pts: QTPoint[], qx: number, qy: number, maxDist: number): QTPoint | null {
    let best: QTPoint | null = null;
    let bestD2 = maxDist * maxDist;
    for (const p of pts) {
      const d2 = (qx - p.sx) ** 2 + (qy - p.sy) ** 2;
      if (d2 < bestD2) { bestD2 = d2; best = p; }
    }
    return best;
  }

  it('matches linear scan over 2,000 random queries', () => {
    const r = rng(10);
    const N = 2000;
    const pts: QTPoint[] = Array.from({ length: N }, (_, i) => ({
      sx: r() * 1000, sy: r() * 600, index: i,
    }));
    const qt = new Quadtree({ x: 0, y: 0, w: 1000, h: 600 });
    for (const pt of pts) qt.insert(pt);

    let mismatches = 0;
    for (let q = 0; q < 200; q++) {
      const qx = r() * 1000, qy = r() * 600;
      const a = qt.nearest(qx, qy, 100);
      const b = linearNearest(pts, qx, qy, 100);
      // Either both null or same squared distance to query (ties allowed).
      if (a === null && b === null) continue;
      if (!a || !b) { mismatches++; continue; }
      const da2 = (qx - a.sx) ** 2 + (qy - a.sy) ** 2;
      const db2 = (qx - b.sx) ** 2 + (qy - b.sy) ** 2;
      if (Math.abs(da2 - db2) > 1e-9) mismatches++;
    }
    expect(mismatches).toBe(0);
  });

  it('queryRect returns exactly the points inside the rect', () => {
    const r = rng(11);
    const pts: QTPoint[] = Array.from({ length: 500 }, (_, i) => ({
      sx: r() * 200, sy: r() * 200, index: i,
    }));
    const qt = new Quadtree({ x: 0, y: 0, w: 200, h: 200 });
    for (const pt of pts) qt.insert(pt);
    const rect = { x: 50, y: 50, w: 80, h: 60 };
    const expected = pts.filter(p =>
      p.sx >= rect.x && p.sx <= rect.x + rect.w &&
      p.sy >= rect.y && p.sy <= rect.y + rect.h,
    );
    const got = qt.queryRect(rect.x, rect.y, rect.w, rect.h);
    expect(new Set(got.map(p => p.index))).toEqual(new Set(expected.map(p => p.index)));
  });

  it('size reports total inserted points', () => {
    const qt = new Quadtree({ x: 0, y: 0, w: 100, h: 100 });
    for (let i = 0; i < 50; i++) qt.insert({ sx: i, sy: i, index: i });
    expect(qt.size).toBeGreaterThanOrEqual(50);
  });
});

// ─────────────────────────────────────────────────────────
//  Viewport
// ─────────────────────────────────────────────────────────
describe('visibleRange — vs linear filter', () => {
  it('matches a linear-scan reference', () => {
    const r = rng(20);
    for (let trial = 0; trial < 50; trial++) {
      const n = 100 + Math.floor(r() * 1000);
      // Sorted ascending.
      const xs = Array.from({ length: n }, (_, i) => i + r() * 0.0001).sort((a, b) => a - b);
      const lo = r() * n * 0.8;
      const hi = lo + r() * (n - lo);
      const [s, e] = visibleRange(xs, lo, hi, 0);
      // Linear: indices where xs[i] in [lo, hi]
      const linear: number[] = [];
      for (let i = 0; i < n; i++) if (xs[i] >= lo && xs[i] <= hi) linear.push(i);
      if (linear.length === 0) continue;
      expect(s).toBeLessThanOrEqual(linear[0]);
      expect(e).toBeGreaterThanOrEqual(linear[linear.length - 1]);
    }
  });

  it('respects pad parameter', () => {
    const xs = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90];
    const [s, e] = visibleRange(xs, 25, 55, 1);
    // 25-55 → indices 3,4,5; with pad 1 → 2..6
    expect(s).toBe(2);
    expect(e).toBe(6);
  });

  it('handles empty / single-point arrays', () => {
    expect(visibleRange([], 0, 100)).toEqual([0, 0]);
    expect(visibleRange([5], 0, 10)).toEqual([0, 0]);
  });
});

describe('visibleBarRange / isVisible', () => {
  it('visibleBarRange clamps to array bounds', () => {
    expect(visibleBarRange(20, 0, 200, 10, 0)).toEqual([0, 19]);
    expect(visibleBarRange(20, 0, 100, 10, 50)).toEqual([4, 16]);
  });

  it('isVisible accounts for margin', () => {
    const b = { xMin: 0, xMax: 100, yMin: 0, yMax: 100 };
    expect(isVisible(50, 50, b)).toBe(true);
    expect(isVisible(-5, 50, b, 10)).toBe(true);
    expect(isVisible(-15, 50, b, 10)).toBe(false);
    expect(isVisible(50, 110, b, 10)).toBe(true);
    expect(isVisible(50, 120, b, 10)).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────
//  StreamBuffer correctness vs naive ring buffer
// ─────────────────────────────────────────────────────────
describe('StreamBuffer — semantic correctness', () => {
  it('toArray yields oldest→newest after wrap', () => {
    const buf = new StreamBuffer(5);
    for (let i = 1; i <= 8; i++) buf.push(i); // pushed 1..8, kept last 5 → [4,5,6,7,8]
    expect(buf.toArray()).toEqual([4, 5, 6, 7, 8]);
    expect(buf.length).toBe(5);
  });

  it('get(index) is consistent with toArray', () => {
    const buf = new StreamBuffer(7);
    for (let i = 0; i < 12; i++) buf.push(i * 2);
    const arr = buf.toArray();
    for (let i = 0; i < arr.length; i++) {
      expect(buf.get(i)).toBe(arr[i]);
    }
  });

  it('tail(n) returns the last n in order', () => {
    const buf = new StreamBuffer(10);
    for (let i = 0; i < 6; i++) buf.push(i);
    expect(buf.tail(3)).toEqual([3, 4, 5]);
    expect(buf.tail(20)).toEqual([0, 1, 2, 3, 4, 5]);
  });

  it('minMax invalidates on push and clear', () => {
    const buf = new StreamBuffer(10);
    buf.push(5); buf.push(2); buf.push(9);
    expect(buf.minMax()).toEqual([2, 9]);
    buf.push(-1);
    expect(buf.minMax()).toEqual([-1, 9]);
    buf.clear();
    buf.push(42);
    expect(buf.minMax()).toEqual([42, 42]);
  });

  it('snapshot is cached but invalidated on push', () => {
    const buf = new StreamBuffer(5);
    buf.push(1); buf.push(2);
    const a = buf.toArray();
    const b = buf.toArray();
    expect(a).toBe(b); // identity preserved (cached)
    buf.push(3);
    const c = buf.toArray();
    expect(c).not.toBe(a);
    expect(c).toEqual([1, 2, 3]);
  });
});

describe('StreamDataset — multi-series sync', () => {
  it('keeps labels and series aligned through wraps', () => {
    const ds = new StreamDataset(['a', 'b'], 4);
    for (let i = 0; i < 7; i++) ds.push(`t${i}`, { a: i, b: i * 2 });
    const r = ds.toResolvedData();
    expect(r.labels).toEqual(['t3', 't4', 't5', 't6']);
    expect(r.datasets[0].data).toEqual([3, 4, 5, 6]);
    expect(r.datasets[1].data).toEqual([6, 8, 10, 12]);
  });

  it('missing series values default to 0', () => {
    const ds = new StreamDataset(['a', 'b'], 3);
    ds.push('t0', { a: 5 });
    expect(ds.toResolvedData().datasets[1].data).toEqual([0]);
  });
});

// ─────────────────────────────────────────────────────────
//  niceScale / niceNum
// ─────────────────────────────────────────────────────────
describe('niceScale — invariants', () => {
  it('always brackets [min, max]', () => {
    const r = rng(30);
    for (let trial = 0; trial < 100; trial++) {
      const a = (r() - 0.5) * 1e6;
      const b = a + r() * 1e5;
      const s = niceScale(a, b);
      expect(s.min).toBeLessThanOrEqual(a + 1e-9);
      expect(s.max).toBeGreaterThanOrEqual(b - 1e-9);
      expect(s.step).toBeGreaterThan(0);
    }
  });

  it('handles min === max', () => {
    const s = niceScale(5, 5);
    expect(s.min).toBeLessThan(5);
    expect(s.max).toBeGreaterThan(5);
  });

  it('handles inverted min > max', () => {
    const s = niceScale(10, 5);
    expect(s.min).toBeLessThanOrEqual(5);
    expect(s.max).toBeGreaterThanOrEqual(10);
  });

  it('handles non-finite inputs', () => {
    const s1 = niceScale(NaN, 10);
    const s2 = niceScale(0, Infinity);
    expect(isFinite(s1.min)).toBe(true);
    expect(isFinite(s1.max)).toBe(true);
    expect(isFinite(s2.min)).toBe(true);
    expect(isFinite(s2.max)).toBe(true);
  });

  it('niceNum returns canonical 1/2/5/10 × 10^k', () => {
    expect(niceNum(0.9, true)).toBeCloseTo(1);
    expect(niceNum(2.4, true)).toBeCloseTo(2);
    expect(niceNum(7, true)).toBeCloseTo(10);
    expect(niceNum(15, false)).toBeCloseTo(20);
  });
});

// ─────────────────────────────────────────────────────────
//  Array helpers
// ─────────────────────────────────────────────────────────
describe('arrayMin / arrayMax / arraysExtent', () => {
  it('matches Math.min/max on small arrays', () => {
    const r = rng(40);
    for (let trial = 0; trial < 50; trial++) {
      const n = 1 + Math.floor(r() * 100);
      const a = Array.from({ length: n }, () => (r() - 0.5) * 1000);
      expect(arrayMin(a)).toBe(Math.min(...a));
      expect(arrayMax(a)).toBe(Math.max(...a));
    }
  });

  it('returns 0 for empty array (sane fallback)', () => {
    expect(arrayMin([])).toBe(0);
    expect(arrayMax([])).toBe(0);
    expect(arraysExtent([])).toEqual([0, 0]);
    expect(arraysExtent([[]])).toEqual([0, 0]);
  });

  it('arraysExtent equals union extent', () => {
    expect(arraysExtent([[1, 2, 3], [10, -5], [0]])).toEqual([-5, 10]);
  });

  it('handles 1M-element array without stack overflow', () => {
    const big = new Float64Array(1_000_000);
    for (let i = 0; i < big.length; i++) big[i] = Math.sin(i);
    const a = arrayMin(big);
    const b = arrayMax(big);
    expect(b).toBeLessThanOrEqual(1);
    expect(a).toBeGreaterThanOrEqual(-1);
  });
});

describe('Treemap squarify — area conservation', () => {
  // Cross-check via the public TreemapChart: render with known data,
  // then assert the rendered _rects sum to the input area and each
  // rect's area is proportional to its value.
  it('rect areas are proportional to item values', async () => {
    const { TreemapChart } = await import('../../src/charts/extra');
    const div = document.createElement('div');
    div.style.cssText = 'width:600px;height:400px';
    document.body.appendChild(div);
    const c = new TreemapChart(div, { animate: false });
    const items = [
      { name: 'A', value: 50 },
      { name: 'B', value: 30 },
      { name: 'C', value: 15 },
      { name: 'D', value: 5 },
    ];
    c.setData(items);
    // Force a draw to populate _rects (animate=false → t=1 immediately).
    c.resize();
    const rects = (c as any)._rects as Array<{ rx:number; ry:number; rw:number; rh:number; value:number }>;
    expect(rects.length).toBe(4);

    const total = items.reduce((a, b) => a + b.value, 0);
    const plotArea = c.plotArea;
    const plotAreaPx = plotArea.w * plotArea.h;

    let sumArea = 0;
    for (const r of rects) {
      const rectArea = r.rw * r.rh;
      const expectedFrac = r.value / total;
      const actualFrac = rectArea / plotAreaPx;
      expect(actualFrac).toBeCloseTo(expectedFrac, 3);
      sumArea += rectArea;
    }
    expect(sumArea).toBeCloseTo(plotAreaPx, 0);

    c.destroy();
    div.remove();
  });

  it('rectangles do not overlap', async () => {
    const { TreemapChart } = await import('../../src/charts/extra');
    const div = document.createElement('div');
    div.style.cssText = 'width:600px;height:400px';
    document.body.appendChild(div);
    const c = new TreemapChart(div, { animate: false });
    c.setData([
      { name: 'A', value: 40 },
      { name: 'B', value: 30 },
      { name: 'C', value: 20 },
      { name: 'D', value: 10 },
    ]);
    c.resize();
    const rects = (c as any)._rects as Array<{ rx:number; ry:number; rw:number; rh:number }>;
    for (let i = 0; i < rects.length; i++) {
      for (let j = i + 1; j < rects.length; j++) {
        const a = rects[i], b = rects[j];
        const overlapX = Math.max(0, Math.min(a.rx + a.rw, b.rx + b.rw) - Math.max(a.rx, b.rx));
        const overlapY = Math.max(0, Math.min(a.ry + a.rh, b.ry + b.rh) - Math.max(a.ry, b.ry));
        // Allow tiny shared-edge overlap from FP rounding.
        expect(overlapX * overlapY).toBeLessThan(0.1);
      }
    }
    c.destroy();
    div.remove();
  });
});

describe('clamp / lerp', () => {
  it('clamp', () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-1, 0, 10)).toBe(0);
    expect(clamp(11, 0, 10)).toBe(10);
  });
  it('lerp', () => {
    expect(lerp(0, 10, 0)).toBe(0);
    expect(lerp(0, 10, 1)).toBe(10);
    expect(lerp(0, 10, 0.5)).toBe(5);
    // Allows extrapolation.
    expect(lerp(0, 10, 1.5)).toBe(15);
    expect(lerp(0, 10, -0.5)).toBe(-5);
  });
});
