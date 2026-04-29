import { describe, it, expect } from 'vitest';
import { lttbIndices, lttbDownsample, lttbDownsampleXY, autoTarget } from '../../src/perf/lttb';

describe('lttbIndices', () => {
  it('returns all indices when data <= target', () => {
    expect(lttbIndices([1, 2, 3], 5)).toEqual([0, 1, 2]);
    expect(lttbIndices([1, 2, 3], 3)).toEqual([0, 1, 2]);
  });

  it('returns target < 3 unchanged', () => {
    expect(lttbIndices([10, 20, 30, 40, 50], 2)).toEqual([0, 1, 2, 3, 4]);
  });

  it('always preserves first and last index', () => {
    const data = Array.from({ length: 1000 }, (_, i) => Math.sin(i * 0.01) * 100);
    const indices = lttbIndices(data, 50);
    expect(indices[0]).toBe(0);
    expect(indices[indices.length - 1]).toBe(999);
  });

  it('returns exactly target indices', () => {
    const data = Array.from({ length: 10000 }, (_, i) => Math.sin(i * 0.01) * 100);
    const indices = lttbIndices(data, 200);
    expect(indices.length).toBe(200);
  });

  it('indices are sorted ascending', () => {
    const data = Array.from({ length: 5000 }, () => Math.random() * 1000);
    const indices = lttbIndices(data, 100);
    for (let i = 1; i < indices.length; i++) {
      expect(indices[i]).toBeGreaterThan(indices[i - 1]);
    }
  });

  it('all indices are valid array positions', () => {
    const data = Array.from({ length: 500 }, () => Math.random() * 100);
    const indices = lttbIndices(data, 30);
    for (const idx of indices) {
      expect(idx).toBeGreaterThanOrEqual(0);
      expect(idx).toBeLessThan(500);
    }
  });

  it('preserves peaks and valleys in sine wave', () => {
    // A sine wave sampled at 10K points has clear peaks/valleys
    // LTTB should keep those features
    const data = Array.from({ length: 10000 }, (_, i) => Math.sin(i * 0.01) * 100);
    const indices = lttbIndices(data, 100);
    const sampled = indices.map(i => data[i]);
    const maxVal = Math.max(...sampled);
    const minVal = Math.min(...sampled);
    // Should preserve most of the range
    expect(maxVal).toBeGreaterThan(90);
    expect(minVal).toBeLessThan(-90);
  });

  it('handles flat data', () => {
    const data = new Array(1000).fill(42);
    const indices = lttbIndices(data, 20);
    expect(indices.length).toBe(20);
  });

  it('handles monotonically increasing data', () => {
    const data = Array.from({ length: 1000 }, (_, i) => i);
    const indices = lttbIndices(data, 50);
    expect(indices.length).toBe(50);
    // For linear data, indices should be roughly evenly spaced
    const gaps = indices.slice(1).map((v, i) => v - indices[i]);
    const avgGap = gaps.reduce((a, b) => a + b) / gaps.length;
    expect(avgGap).toBeGreaterThan(10);
    expect(avgGap).toBeLessThan(30);
  });

  it('handles 100K points efficiently', () => {
    const data = Array.from({ length: 100_000 }, (_, i) =>
      Math.sin(i * 0.001) * 50 + Math.random() * 10
    );
    const start = performance.now();
    const indices = lttbIndices(data, 2000);
    const elapsed = performance.now() - start;
    expect(indices.length).toBe(2000);
    expect(elapsed).toBeLessThan(200); // Should complete in < 200ms
  });
});

describe('lttbDownsample', () => {
  it('returns LTTBPoint objects with originalIndex', () => {
    const data = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
    const result = lttbDownsample(data, 5);
    expect(result.length).toBe(5);
    result.forEach(pt => {
      expect(pt).toHaveProperty('x');
      expect(pt).toHaveProperty('y');
      expect(pt).toHaveProperty('originalIndex');
      expect(pt.y).toBe(data[pt.originalIndex]);
    });
  });
});

describe('lttbDownsampleXY', () => {
  it('downsamples paired XY arrays', () => {
    const xs = Array.from({ length: 1000 }, (_, i) => i);
    const ys = Array.from({ length: 1000 }, (_, i) => Math.sin(i * 0.01) * 100);
    const result = lttbDownsampleXY(xs, ys, 50);
    expect(result.xs.length).toBe(50);
    expect(result.ys.length).toBe(50);
    expect(result.indices.length).toBe(50);
    expect(result.xs[0]).toBe(0);
    expect(result.xs[49]).toBe(999);
  });

  it('passes through data smaller than target', () => {
    const xs = [1, 2, 3];
    const ys = [10, 20, 30];
    const result = lttbDownsampleXY(xs, ys, 10);
    expect(result.xs).toEqual([1, 2, 3]);
    expect(result.ys).toEqual([10, 20, 30]);
  });
});

describe('autoTarget', () => {
  it('returns data length when within budget', () => {
    expect(autoTarget(100, 800)).toBe(100); // 100 < 800*2=1600
  });

  it('limits to 2x pixel width by default', () => {
    expect(autoTarget(10000, 800)).toBe(1600); // 800 * 2
  });

  it('respects custom ppx', () => {
    expect(autoTarget(10000, 800, 1)).toBe(800);
    expect(autoTarget(10000, 800, 3)).toBe(2400);
  });

  it('never returns less than 3', () => {
    expect(autoTarget(10000, 1)).toBe(3);
  });
});
