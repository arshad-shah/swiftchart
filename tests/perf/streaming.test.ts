import { describe, it, expect } from 'vitest';
import { StreamBuffer, StreamDataset } from '../../src/perf/streaming';

describe('StreamBuffer', () => {
  it('starts empty', () => {
    const buf = new StreamBuffer(100);
    expect(buf.length).toBe(0);
    expect(buf.toArray()).toEqual([]);
  });

  it('push and get', () => {
    const buf = new StreamBuffer(100);
    buf.push(10);
    buf.push(20);
    buf.push(30);
    expect(buf.length).toBe(3);
    expect(buf.get(0)).toBe(10);
    expect(buf.get(1)).toBe(20);
    expect(buf.get(2)).toBe(30);
  });

  it('toArray returns values in order', () => {
    const buf = new StreamBuffer(100);
    buf.pushMany([1, 2, 3, 4, 5]);
    expect(buf.toArray()).toEqual([1, 2, 3, 4, 5]);
  });

  it('wraps around when full', () => {
    const buf = new StreamBuffer(5);
    buf.pushMany([1, 2, 3, 4, 5, 6, 7]);
    expect(buf.length).toBe(5);
    expect(buf.toArray()).toEqual([3, 4, 5, 6, 7]);
  });

  it('get returns 0 for out-of-bounds', () => {
    const buf = new StreamBuffer(10);
    buf.push(42);
    expect(buf.get(-1)).toBe(0);
    expect(buf.get(10)).toBe(0);
  });

  it('tail returns last N values', () => {
    const buf = new StreamBuffer(100);
    buf.pushMany([10, 20, 30, 40, 50]);
    expect(buf.tail(3)).toEqual([30, 40, 50]);
    expect(buf.tail(10)).toEqual([10, 20, 30, 40, 50]);
  });

  it('clear resets buffer', () => {
    const buf = new StreamBuffer(100);
    buf.pushMany([1, 2, 3]);
    buf.clear();
    expect(buf.length).toBe(0);
    expect(buf.toArray()).toEqual([]);
  });

  it('minMax computes correctly', () => {
    const buf = new StreamBuffer(100);
    buf.pushMany([50, 10, 90, 30, 70]);
    const [min, max] = buf.minMax();
    expect(min).toBe(10);
    expect(max).toBe(90);
  });

  it('minMax returns [0, 0] for empty buffer', () => {
    const buf = new StreamBuffer(100);
    expect(buf.minMax()).toEqual([0, 0]);
  });

  it('handles capacity of 1', () => {
    const buf = new StreamBuffer(1);
    buf.push(10);
    expect(buf.toArray()).toEqual([10]);
    buf.push(20);
    expect(buf.toArray()).toEqual([20]);
    expect(buf.length).toBe(1);
  });

  it('toArray caches result until dirty', () => {
    const buf = new StreamBuffer(100);
    buf.pushMany([1, 2, 3]);
    const arr1 = buf.toArray();
    const arr2 = buf.toArray();
    expect(arr1).toBe(arr2); // Same reference (cached)
    buf.push(4);
    const arr3 = buf.toArray();
    expect(arr3).not.toBe(arr1); // New array after mutation
  });

  it('handles large streaming workload', () => {
    const buf = new StreamBuffer(10_000);
    const start = performance.now();
    for (let i = 0; i < 100_000; i++) {
      buf.push(Math.sin(i * 0.01) * 100);
    }
    const elapsed = performance.now() - start;
    expect(buf.length).toBe(10_000);
    expect(elapsed).toBeLessThan(200);
    const arr = buf.toArray();
    expect(arr.length).toBe(10_000);
  });
});

describe('StreamDataset', () => {
  it('creates multi-series dataset', () => {
    const ds = new StreamDataset(['cpu', 'memory']);
    expect(ds.length).toBe(0);
  });

  it('push adds rows', () => {
    const ds = new StreamDataset(['cpu', 'memory'], 100);
    ds.push('t1', { cpu: 45, memory: 12 });
    ds.push('t2', { cpu: 52, memory: 13 });
    expect(ds.length).toBe(2);
  });

  it('toResolvedData returns chart-compatible format', () => {
    const ds = new StreamDataset(['cpu', 'memory'], 100);
    ds.push('t1', { cpu: 45, memory: 12 });
    ds.push('t2', { cpu: 52, memory: 13 });
    const resolved = ds.toResolvedData();
    expect(resolved.labels).toEqual(['t1', 't2']);
    expect(resolved.datasets.length).toBe(2);
    expect(resolved.datasets[0].label).toBe('cpu');
    expect(resolved.datasets[0].data).toEqual([45, 52]);
    expect(resolved.datasets[1].label).toBe('memory');
    expect(resolved.datasets[1].data).toEqual([12, 13]);
  });

  it('pushMany adds multiple rows', () => {
    const ds = new StreamDataset(['val'], 100);
    ds.pushMany([
      { label: 'a', values: { val: 10 } },
      { label: 'b', values: { val: 20 } },
      { label: 'c', values: { val: 30 } },
    ]);
    expect(ds.length).toBe(3);
  });

  it('respects capacity (ring buffer)', () => {
    const ds = new StreamDataset(['val'], 3);
    ds.push('a', { val: 1 });
    ds.push('b', { val: 2 });
    ds.push('c', { val: 3 });
    ds.push('d', { val: 4 });
    const resolved = ds.toResolvedData();
    expect(resolved.labels).toEqual(['b', 'c', 'd']);
    expect(resolved.datasets[0].data).toEqual([2, 3, 4]);
  });

  it('clear empties all series', () => {
    const ds = new StreamDataset(['a', 'b'], 100);
    ds.push('t1', { a: 1, b: 2 });
    ds.clear();
    expect(ds.length).toBe(0);
    const resolved = ds.toResolvedData();
    expect(resolved.labels).toEqual([]);
  });

  it('handles missing series values', () => {
    const ds = new StreamDataset(['a', 'b'], 100);
    ds.push('t1', { a: 10 }); // b is missing → should default to 0
    const resolved = ds.toResolvedData();
    expect(resolved.datasets[1].data).toEqual([0]);
  });
});
