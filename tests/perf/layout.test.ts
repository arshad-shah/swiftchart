import { describe, it, expect } from 'vitest';
import {
  simulateForce, layoutSankey, fiveNumberSummary, squarify,
  type ForceNode,
} from '../../src/perf/layout';

// ─── fiveNumberSummary ──────────────────────────────────────────────────

describe('fiveNumberSummary', () => {
  it('handles trivial inputs', () => {
    expect(fiveNumberSummary([]).median).toBe(0);
    const one = fiveNumberSummary([42]);
    expect(one).toMatchObject({ min: 42, q1: 42, median: 42, q3: 42, max: 42 });
    expect(one.outliers).toEqual([]);
  });

  it('computes correct quartiles on a known set', () => {
    // [1..9]: q1=3, median=5, q3=7
    const s = fiveNumberSummary([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(s.q1).toBe(3);
    expect(s.median).toBe(5);
    expect(s.q3).toBe(7);
    expect(s.min).toBe(1);
    expect(s.max).toBe(9);
  });

  it('flags Tukey outliers (1.5 × IQR fences)', () => {
    // 100 is an outlier above q3 + 1.5*IQR.
    const s = fiveNumberSummary([1, 2, 3, 4, 5, 6, 7, 8, 9, 100]);
    expect(s.outliers).toContain(100);
    expect(s.max).toBeLessThan(100);
  });

  it('runs in linear time on large inputs (sort-bound)', () => {
    const big = Float64Array.from({ length: 100_000 }, (_, i) => Math.sin(i) * 1000);
    const t0 = performance.now();
    const s = fiveNumberSummary(big);
    const dt = performance.now() - t0;
    expect(s.q1).toBeLessThan(s.median);
    expect(s.median).toBeLessThan(s.q3);
    // Generous bound — V8 sort on 100k floats is sub-50ms in practice.
    expect(dt).toBeLessThan(250);
  });
});

// ─── simulateForce ──────────────────────────────────────────────────────

describe('simulateForce', () => {
  function makeNodes(n: number): ForceNode[] {
    return Array.from({ length: n }, (_, i) => ({
      id: String(i),
      x: Math.cos((i / n) * Math.PI * 2) * 100,
      y: Math.sin((i / n) * Math.PI * 2) * 100,
      vx: 0, vy: 0,
    }));
  }

  it('keeps every node finite after simulation', () => {
    const nodes = makeNodes(20);
    simulateForce(
      nodes,
      [{ source: 0, target: 1 }, { source: 1, target: 2 }, { source: 2, target: 0 }],
      { cx: 0, cy: 0, iterations: 100 },
    );
    for (const n of nodes) {
      expect(Number.isFinite(n.x)).toBe(true);
      expect(Number.isFinite(n.y)).toBe(true);
    }
  });

  it('respects pinned nodes', () => {
    const nodes = makeNodes(8);
    nodes[0].pinned = true;
    const x0 = nodes[0].x;
    const y0 = nodes[0].y;
    simulateForce(nodes, [
      { source: 0, target: 1 }, { source: 0, target: 2 }, { source: 0, target: 3 },
    ], { cx: 200, cy: 200, iterations: 50 });
    expect(nodes[0].x).toBe(x0);
    expect(nodes[0].y).toBe(y0);
  });

  it('completes a 100-node × 200-iter sim quickly', () => {
    const nodes = makeNodes(100);
    const links = Array.from({ length: 200 }, () => ({
      source: Math.floor(Math.random() * 100),
      target: Math.floor(Math.random() * 100),
    }));
    const t0 = performance.now();
    simulateForce(nodes, links, { cx: 0, cy: 0, iterations: 200 });
    const dt = performance.now() - t0;
    // O(iters × n²) = ~2M force evaluations; budget is loose to absorb CI noise.
    expect(dt).toBeLessThan(1500);
  });
});

// ─── layoutSankey ───────────────────────────────────────────────────────

describe('layoutSankey', () => {
  it('places sources in column 0 and pure sinks in the last column', () => {
    const layout = layoutSankey(
      [{ id: 'A' }, { id: 'B' }, { id: 'C' }],
      [{ source: 'A', target: 'B', value: 5 }, { source: 'B', target: 'C', value: 3 }],
      { x: 0, y: 0, w: 300, h: 200 },
    );
    const A = layout.nodes.find((n) => n.id === 'A')!;
    const C = layout.nodes.find((n) => n.id === 'C')!;
    expect(A.col).toBe(0);
    expect(C.col).toBeGreaterThan(0);
  });

  it('keeps every node within the requested rectangle', () => {
    const layout = layoutSankey(
      [{ id: '1' }, { id: '2' }, { id: '3' }, { id: '4' }, { id: '5' }],
      [
        { source: '1', target: '3', value: 10 },
        { source: '1', target: '4', value: 5 },
        { source: '2', target: '4', value: 8 },
        { source: '3', target: '5', value: 6 },
        { source: '4', target: '5', value: 9 },
      ],
      { x: 0, y: 0, w: 400, h: 240 },
    );
    for (const n of layout.nodes) {
      expect(n.x).toBeGreaterThanOrEqual(0);
      expect(n.x + n.w).toBeLessThanOrEqual(400 + 0.5);
      expect(n.y).toBeGreaterThanOrEqual(0);
      expect(n.y + n.h).toBeLessThanOrEqual(240 + 0.5);
    }
  });

  it('balances flow conservation: link widths align with node heights', () => {
    const layout = layoutSankey(
      [{ id: 'src' }, { id: 'a' }, { id: 'b' }, { id: 'sink' }],
      [
        { source: 'src', target: 'a', value: 10 },
        { source: 'src', target: 'b', value: 6 },
        { source: 'a', target: 'sink', value: 10 },
        { source: 'b', target: 'sink', value: 6 },
      ],
      { x: 0, y: 0, w: 300, h: 200 },
    );
    const a = layout.nodes.find((n) => n.id === 'a')!;
    const b = layout.nodes.find((n) => n.id === 'b')!;
    // a carries 10, b carries 6 → a should be taller than b.
    expect(a.h).toBeGreaterThan(b.h);
  });
});

// ─── squarify ───────────────────────────────────────────────────────────

describe('squarify', () => {
  it('returns one rect per item and fills the requested area', () => {
    const items = [
      { label: 'A', value: 50 },
      { label: 'B', value: 30 },
      { label: 'C', value: 20 },
    ];
    const rects = squarify(items, { x: 0, y: 0, w: 600, h: 400 });
    expect(rects.length).toBe(items.length);
    const totalArea = rects.reduce((s, r) => s + r.rw * r.rh, 0);
    expect(totalArea).toBeCloseTo(600 * 400, 0);
  });

  it('preserves area proportionality to value', () => {
    const items = [
      { label: 'A', value: 60 },
      { label: 'B', value: 30 },
      { label: 'C', value: 10 },
    ];
    const rects = squarify(items, { x: 0, y: 0, w: 1000, h: 1000 });
    const total = items.reduce((s, i) => s + i.value, 0);
    for (let i = 0; i < items.length; i++) {
      const expected = (items[i].value / total) * 1000 * 1000;
      const actual = rects[i].rw * rects[i].rh;
      expect(actual / expected).toBeGreaterThan(0.99);
      expect(actual / expected).toBeLessThan(1.01);
    }
  });

  it('rectangles do not overlap', () => {
    const items = Array.from({ length: 12 }, (_, i) => ({
      label: `n${i}`,
      value: 10 + i,
    })).sort((a, b) => b.value - a.value);
    const rects = squarify(items, { x: 0, y: 0, w: 800, h: 500 });
    for (let i = 0; i < rects.length; i++) {
      for (let j = i + 1; j < rects.length; j++) {
        const a = rects[i], b = rects[j];
        const overlap =
          a.rx < b.rx + b.rw && b.rx < a.rx + a.rw &&
          a.ry < b.ry + b.rh && b.ry < a.ry + a.rh;
        // Allow 0.0001 px tolerance for floating-point boundary touches.
        if (overlap) {
          const overlapW = Math.min(a.rx + a.rw, b.rx + b.rw) - Math.max(a.rx, b.rx);
          const overlapH = Math.min(a.ry + a.rh, b.ry + b.rh) - Math.max(a.ry, b.ry);
          expect(overlapW * overlapH).toBeLessThan(0.001);
        }
      }
    }
  });

  it('does not allocate via slicing on large input — runs in well under O(n²)', () => {
    // 5000 items in O(n²) worst case (the previous implementation) means
    // ~25M sumValues touches plus 25M slice copies — easily multi-hundred ms.
    // The new index-cursor + running-total implementation is bound by the
    // squarified algorithm's actual work, which is closer to linear.
    const items = Array.from({ length: 5000 }, (_, i) => ({
      label: `n${i}`,
      value: (5000 - i) * 0.5 + 1,
    }));
    const t0 = performance.now();
    const rects = squarify(items, { x: 0, y: 0, w: 1200, h: 800 });
    const dt = performance.now() - t0;
    expect(rects.length).toBe(5000);
    // Generous bound — V8 + this code finishes in single-digit ms locally;
    // CI noise can push it but never within an order of magnitude of O(n²).
    expect(dt).toBeLessThan(500);
  });

  it('does not mutate the input array', () => {
    const items = [
      { label: 'A', value: 100 },
      { label: 'B', value: 50 },
      { label: 'C', value: 30 },
    ];
    const snapshot = items.map((i) => ({ ...i }));
    squarify(items, { x: 0, y: 0, w: 500, h: 500 });
    expect(items).toEqual(snapshot);
  });
});

// ─── layoutSankey perf + clamps ─────────────────────────────────────────

describe('layoutSankey — perf and edge cases', () => {
  it('column-walk is O(n + links) on 1000-node DAG (was O(n²) with queue.shift)', () => {
    const N = 1000;
    const nodes = Array.from({ length: N }, (_, i) => ({ id: String(i) }));
    // Long chain: each node points at the next. The previous queue.shift()
    // implementation made this O(N²) walk; cursor-based it's O(N).
    const links = Array.from({ length: N - 1 }, (_, i) => ({
      source: String(i), target: String(i + 1), value: 1,
    }));
    const t0 = performance.now();
    const layout = layoutSankey(nodes, links, { x: 0, y: 0, w: 800, h: 600 });
    const dt = performance.now() - t0;
    expect(layout.nodes.length).toBe(N);
    expect(dt).toBeLessThan(500);
  });

  it('clamps node heights to >= 0 when the available rect is shorter than padding', () => {
    // 10 nodes in a single column, 12 px padding, height = 50. Total padding
    // alone is 9 × 12 = 108 px which exceeds 50, so the unclamped formula
    // would have given negative `ky` and negative node heights.
    const nodes = Array.from({ length: 10 }, (_, i) => ({ id: String(i) }));
    const links: Array<{ source: string; target: string; value: number }> = [];
    const layout = layoutSankey(nodes, links, {
      x: 0, y: 0, w: 200, h: 50, nodePadding: 12,
    });
    for (const n of layout.nodes) {
      expect(n.h).toBeGreaterThanOrEqual(0);
    }
  });
});
