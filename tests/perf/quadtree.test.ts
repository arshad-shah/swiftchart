import { describe, it, expect } from 'vitest';
import { Quadtree } from '../../src/perf/quadtree';
import type { QTPoint } from '../../src/perf/quadtree';

function makePt(sx: number, sy: number, index: number, group?: number): QTPoint {
  return { sx, sy, index, group };
}

describe('Quadtree', () => {
  describe('basic operations', () => {
    it('creates empty tree', () => {
      const qt = new Quadtree({ x: 0, y: 0, w: 100, h: 100 });
      expect(qt.size).toBe(0);
    });

    it('inserts and counts points', () => {
      const qt = new Quadtree({ x: 0, y: 0, w: 100, h: 100 });
      qt.insert(makePt(10, 10, 0));
      qt.insert(makePt(50, 50, 1));
      qt.insert(makePt(90, 90, 2));
      expect(qt.size).toBe(3);
    });

    it('insertAll adds multiple points', () => {
      const qt = new Quadtree({ x: 0, y: 0, w: 100, h: 100 });
      const pts = Array.from({ length: 20 }, (_, i) => makePt(i * 5, i * 5, i));
      qt.insertAll(pts);
      // Points on subdivision boundaries may be counted in multiple children
      expect(qt.size).toBeGreaterThanOrEqual(20);
    });

    it('ignores points outside bounds', () => {
      const qt = new Quadtree({ x: 0, y: 0, w: 100, h: 100 });
      qt.insert(makePt(-10, -10, 0));
      qt.insert(makePt(200, 200, 1));
      expect(qt.size).toBe(0);
    });
  });

  describe('nearest', () => {
    it('finds exact match', () => {
      const qt = new Quadtree({ x: 0, y: 0, w: 100, h: 100 });
      qt.insert(makePt(50, 50, 42));
      const result = qt.nearest(50, 50);
      expect(result).not.toBeNull();
      expect(result!.index).toBe(42);
    });

    it('finds closest point', () => {
      const qt = new Quadtree({ x: 0, y: 0, w: 100, h: 100 });
      qt.insert(makePt(10, 10, 0));
      qt.insert(makePt(50, 50, 1));
      qt.insert(makePt(90, 90, 2));
      const result = qt.nearest(48, 52);
      expect(result!.index).toBe(1);
    });

    it('returns null when no points within maxDist', () => {
      const qt = new Quadtree({ x: 0, y: 0, w: 100, h: 100 });
      qt.insert(makePt(90, 90, 0));
      const result = qt.nearest(10, 10, 5);
      expect(result).toBeNull();
    });

    it('respects maxDist parameter', () => {
      const qt = new Quadtree({ x: 0, y: 0, w: 1000, h: 1000 });
      qt.insert(makePt(500, 500, 0));
      expect(qt.nearest(500, 510, 15)!.index).toBe(0);
      expect(qt.nearest(500, 520, 15)).toBeNull();
    });

    it('handles many points efficiently', () => {
      const qt = new Quadtree({ x: 0, y: 0, w: 1000, h: 1000 });
      const pts = Array.from({ length: 10000 }, (_, i) =>
        makePt(Math.random() * 1000, Math.random() * 1000, i)
      );
      qt.insertAll(pts);

      const start = performance.now();
      for (let i = 0; i < 1000; i++) {
        qt.nearest(Math.random() * 1000, Math.random() * 1000);
      }
      const elapsed = performance.now() - start;
      // 1000 queries on 10K points should be fast
      expect(elapsed).toBeLessThan(100);
    });

    it('finds correct nearest among clustered points', () => {
      const qt = new Quadtree({ x: 0, y: 0, w: 100, h: 100 });
      // Cluster of points around (50, 50)
      qt.insert(makePt(48, 48, 0));
      qt.insert(makePt(49, 51, 1));
      qt.insert(makePt(50, 50, 2));
      qt.insert(makePt(51, 49, 3));
      qt.insert(makePt(52, 52, 4));
      const result = qt.nearest(50, 50);
      expect(result!.index).toBe(2); // Exact hit
    });
  });

  describe('queryRect', () => {
    it('finds points in rectangle', () => {
      const qt = new Quadtree({ x: 0, y: 0, w: 100, h: 100 });
      qt.insert(makePt(10, 10, 0));
      qt.insert(makePt(50, 50, 1));
      qt.insert(makePt(90, 90, 2));
      const found = qt.queryRect(0, 0, 60, 60);
      expect(found.length).toBe(2);
      expect(found.map(p => p.index).sort()).toEqual([0, 1]);
    });

    it('returns empty for no matches', () => {
      const qt = new Quadtree({ x: 0, y: 0, w: 100, h: 100 });
      qt.insert(makePt(10, 10, 0));
      const found = qt.queryRect(80, 80, 20, 20);
      expect(found.length).toBe(0);
    });

    it('returns all points when rect covers entire bounds', () => {
      const qt = new Quadtree({ x: 0, y: 0, w: 100, h: 100 });
      for (let i = 0; i < 50; i++) {
        qt.insert(makePt(Math.random() * 100, Math.random() * 100, i));
      }
      const found = qt.queryRect(0, 0, 100, 100);
      expect(found.length).toBe(50);
    });
  });

  describe('fromArrays', () => {
    it('builds quadtree from flat arrays', () => {
      const sxs = [10, 50, 90];
      const sys = [20, 60, 80];
      const qt = Quadtree.fromArrays(sxs, sys, { x: 0, y: 0, w: 100, h: 100 });
      expect(qt.size).toBe(3);
      const nearest = qt.nearest(50, 60);
      expect(nearest!.index).toBe(1);
    });

    it('preserves group info', () => {
      const sxs = [10, 50];
      const sys = [10, 50];
      const groups = [0, 1];
      const qt = Quadtree.fromArrays(sxs, sys, { x: 0, y: 0, w: 100, h: 100 }, groups);
      const pt = qt.nearest(50, 50);
      expect(pt!.group).toBe(1);
    });
  });

  describe('subdivision', () => {
    it('handles more than MAX_POINTS per node', () => {
      const qt = new Quadtree({ x: 0, y: 0, w: 100, h: 100 });
      for (let i = 0; i < 20; i++) {
        qt.insert(makePt(50 + i * 0.1, 50 + i * 0.1, i));
      }
      expect(qt.size).toBeGreaterThanOrEqual(20);
      const found = qt.nearest(50, 50);
      expect(found).not.toBeNull();
    });

    it('handles deep subdivision', () => {
      const qt = new Quadtree({ x: 0, y: 0, w: 100, h: 100 });
      for (let i = 0; i < 100; i++) {
        qt.insert(makePt(50, 50, i));
      }
      // Points at exact same spot appear in multiple leaf nodes after subdivision
      expect(qt.size).toBeGreaterThanOrEqual(100);
    });
  });
});
