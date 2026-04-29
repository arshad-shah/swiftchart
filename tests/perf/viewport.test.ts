import { describe, it, expect } from 'vitest';
import { visibleRange, visibleBarRange, isVisible, filterVisible } from '../../src/perf/viewport';

describe('visibleRange', () => {
  it('returns full range when all visible', () => {
    const xs = [10, 20, 30, 40, 50];
    const [start, end] = visibleRange(xs, 0, 60);
    expect(start).toBe(0);
    expect(end).toBe(4);
  });

  it('clips to visible window', () => {
    const xs = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
    const [start, end] = visibleRange(xs, 35, 75, 0);
    expect(start).toBe(3); // 40 is first >= 35
    expect(end).toBe(6);  // 70 is last <= 75
  });

  it('includes padding around visible range', () => {
    const xs = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
    const [start, end] = visibleRange(xs, 35, 75, 2);
    expect(start).toBeLessThanOrEqual(1); // pad=2 before first visible
    expect(end).toBeGreaterThanOrEqual(8); // pad=2 after last visible
  });

  it('handles empty array', () => {
    const [start, end] = visibleRange([], 0, 100);
    expect(start).toBe(0);
    expect(end).toBe(0);
  });

  it('handles single element', () => {
    const [start, end] = visibleRange([50], 0, 100);
    expect(start).toBe(0);
    expect(end).toBe(0);
  });

  it('handles all points outside left', () => {
    const xs = [10, 20, 30];
    const [start, end] = visibleRange(xs, 40, 100, 0);
    expect(end).toBeGreaterThanOrEqual(start);
  });

  it('handles all points outside right', () => {
    const xs = [100, 200, 300];
    const [start, end] = visibleRange(xs, 0, 50, 0);
    expect(end).toBeGreaterThanOrEqual(start);
  });

  it('performs binary search efficiently on 100K points', () => {
    const xs = Array.from({ length: 100_000 }, (_, i) => i * 0.1);
    const start = performance.now();
    for (let i = 0; i < 10000; i++) {
      visibleRange(xs, 1000, 5000);
    }
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(100); // 10K queries < 100ms
  });
});

describe('visibleBarRange', () => {
  it('returns full range for no scroll', () => {
    const [start, end] = visibleBarRange(10, 0, 600, 60);
    expect(start).toBe(0);
    expect(end).toBe(9);
  });

  it('clips to visible bars', () => {
    const [start, end] = visibleBarRange(100, 0, 600, 60);
    expect(start).toBe(0);
    expect(end).toBeLessThan(100);
  });
});

describe('isVisible', () => {
  const bounds = { xMin: 0, xMax: 100, yMin: 0, yMax: 100 };

  it('returns true for point inside', () => {
    expect(isVisible(50, 50, bounds)).toBe(true);
  });

  it('returns true for point on edge', () => {
    expect(isVisible(0, 0, bounds)).toBe(true);
    expect(isVisible(100, 100, bounds)).toBe(true);
  });

  it('returns true for point within margin', () => {
    expect(isVisible(-5, 50, bounds, 10)).toBe(true);
    expect(isVisible(105, 50, bounds, 10)).toBe(true);
  });

  it('returns false for point far outside', () => {
    expect(isVisible(200, 200, bounds)).toBe(false);
    expect(isVisible(-50, -50, bounds)).toBe(false);
  });
});

describe('filterVisible', () => {
  it('filters points to viewport', () => {
    const sxs = [10, 50, 150, 200];
    const sys = [10, 50, 10, 50];
    const bounds = { xMin: 0, xMax: 100, yMin: 0, yMax: 100 };
    const visible = filterVisible(sxs, sys, bounds, 0);
    expect(visible).toEqual([0, 1]);
  });

  it('returns all when all visible', () => {
    const sxs = [10, 50, 90];
    const sys = [10, 50, 90];
    const bounds = { xMin: 0, xMax: 100, yMin: 0, yMax: 100 };
    const visible = filterVisible(sxs, sys, bounds);
    expect(visible.length).toBe(3);
  });

  it('returns empty when none visible', () => {
    const sxs = [200, 300];
    const sys = [200, 300];
    const bounds = { xMin: 0, xMax: 100, yMin: 0, yMax: 100 };
    const visible = filterVisible(sxs, sys, bounds, 0);
    expect(visible.length).toBe(0);
  });
});
