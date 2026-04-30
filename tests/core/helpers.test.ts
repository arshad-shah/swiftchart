import { describe, it, expect } from 'vitest';
import {
  dpr, lerp, clamp, niceNum, niceScale, shortNum, hexToRgba, lerpColor, resolveData,
} from '../../src/utils/helpers';

describe('dpr()', () => {
  it('returns devicePixelRatio capped at 3', () => {
    expect(dpr()).toBe(1); // our mock sets it to 1
  });

  it('caps high DPR values', () => {
    (globalThis as any).devicePixelRatio = 5;
    expect(dpr()).toBe(3);
    (globalThis as any).devicePixelRatio = 1;
  });
});

describe('lerp()', () => {
  it('returns start at t=0', () => expect(lerp(0, 100, 0)).toBe(0));
  it('returns end at t=1', () => expect(lerp(0, 100, 1)).toBe(100));
  it('returns midpoint at t=0.5', () => expect(lerp(0, 100, 0.5)).toBe(50));
  it('works with negative ranges', () => expect(lerp(-50, 50, 0.5)).toBe(0));
  it('handles equal start and end', () => expect(lerp(42, 42, 0.7)).toBe(42));
});

describe('clamp()', () => {
  it('clamps below minimum', () => expect(clamp(-5, 0, 100)).toBe(0));
  it('clamps above maximum', () => expect(clamp(150, 0, 100)).toBe(100));
  it('returns value within range', () => expect(clamp(50, 0, 100)).toBe(50));
  it('handles equal min and max', () => expect(clamp(5, 10, 10)).toBe(10));
  it('handles value equal to min', () => expect(clamp(0, 0, 100)).toBe(0));
  it('handles value equal to max', () => expect(clamp(100, 0, 100)).toBe(100));
});

describe('niceNum()', () => {
  it('rounds up to nice numbers', () => {
    expect(niceNum(0.7, true)).toBe(0.5);
    expect(niceNum(2.3, true)).toBe(2);
    expect(niceNum(4.5, true)).toBe(5);
    expect(niceNum(8, true)).toBe(10);
    expect(niceNum(15, true)).toBe(20);
    expect(niceNum(70, true)).toBe(100);
  });

  it('handles non-round mode', () => {
    expect(niceNum(0.5, false)).toBe(0.5);
    expect(niceNum(1.5, false)).toBe(2);
    expect(niceNum(3, false)).toBe(5);
    expect(niceNum(7, false)).toBe(10);
    expect(niceNum(15, false)).toBe(20);
  });

  it('handles large numbers', () => {
    expect(niceNum(7000, true)).toBe(10000);
    expect(niceNum(1500, true)).toBe(2000);
  });

  it('handles small decimals', () => {
    expect(niceNum(0.07, true)).toBe(0.1);
  });
});

describe('niceScale()', () => {
  it('produces sensible min/max/step', () => {
    const s = niceScale(0, 100);
    expect(s.min).toBeLessThanOrEqual(0);
    expect(s.max).toBeGreaterThanOrEqual(100);
    expect(s.step).toBeGreaterThan(0);
  });

  it('handles equal min and max', () => {
    const s = niceScale(50, 50);
    expect(s.min).toBeLessThan(50);
    expect(s.max).toBeGreaterThan(50);
  });

  it('handles negative ranges', () => {
    const s = niceScale(-100, -20);
    expect(s.min).toBeLessThanOrEqual(-100);
    expect(s.max).toBeGreaterThanOrEqual(-20);
  });

  it('handles very large numbers', () => {
    const s = niceScale(0, 1_000_000);
    expect(s.step).toBeGreaterThan(0);
    expect(Number.isFinite(s.max)).toBe(true);
  });

  it('handles NaN/Infinity gracefully', () => {
    const s = niceScale(NaN, Infinity);
    expect(Number.isFinite(s.min)).toBe(true);
    expect(Number.isFinite(s.max)).toBe(true);
  });

  it('respects custom tick count', () => {
    const s3 = niceScale(0, 100, 3);
    const s10 = niceScale(0, 100, 10);
    // More ticks should yield smaller steps
    expect(s10.step).toBeLessThanOrEqual(s3.step);
  });
});

describe('shortNum()', () => {
  it('formats billions', () => expect(shortNum(1_500_000_000)).toBe('1.5B'));
  it('formats millions', () => expect(shortNum(2_300_000)).toBe('2.3M'));
  it('formats thousands', () => expect(shortNum(4_200)).toBe('4.2K'));
  it('formats integers', () => expect(shortNum(42)).toBe('42'));
  it('formats decimals', () => expect(shortNum(3.14159)).toBe('3.1'));
  it('formats zero', () => expect(shortNum(0)).toBe('0'));
  it('formats negative thousands', () => expect(shortNum(-8500)).toBe('-8.5K'));
  it('handles NaN gracefully', () => expect(shortNum(NaN)).toBe('0'));
  it('handles Infinity gracefully', () => expect(shortNum(Infinity)).toBe('0'));
});

describe('hexToRgba()', () => {
  it('converts standard hex', () => {
    expect(hexToRgba('#ff0000', 1)).toBe('rgba(255,0,0,1)');
    expect(hexToRgba('#00ff00', 0.5)).toBe('rgba(0,255,0,0.5)');
    expect(hexToRgba('#0000ff', 0)).toBe('rgba(0,0,255,0)');
  });

  it('converts shorthand hex', () => {
    expect(hexToRgba('#f00', 1)).toBe('rgba(255,0,0,1)');
    expect(hexToRgba('#0f0', 0.5)).toBe('rgba(0,255,0,0.5)');
  });

  it('handles invalid hex gracefully', () => {
    expect(hexToRgba('invalid', 1)).toBe('rgba(0,0,0,1)');
  });

  it('preserves alpha precision', () => {
    expect(hexToRgba('#ffffff', 0.123)).toBe('rgba(255,255,255,0.123)');
  });
});

describe('resolveData()', () => {
  it('returns empty for null/undefined', () => {
    expect(resolveData(null, {})).toEqual({ labels: [], datasets: [] });
    expect(resolveData(undefined, {})).toEqual({ labels: [], datasets: [] });
    expect(resolveData([], {})).toEqual({ labels: [], datasets: [] });
  });

  it('uses pre-built labels and datasets', () => {
    const result = resolveData([], {
      labels: ['A', 'B'],
      datasets: [{ label: 'X', data: [1, 2] }],
    });
    expect(result.labels).toEqual(['A', 'B']);
    expect(result.datasets[0].data).toEqual([1, 2]);
  });

  it('auto-detects string label + number value fields', () => {
    const data = [
      { name: 'Alice', score: 90, age: 25 },
      { name: 'Bob', score: 85, age: 30 },
    ];
    const result = resolveData(data, {});
    expect(result.labels).toEqual(['Alice', 'Bob']);
    // Should auto-detect both number fields
    expect(result.datasets.length).toBe(2);
    expect(result.datasets[0].data).toEqual([90, 85]);
    expect(result.datasets[1].data).toEqual([25, 30]);
  });

  it('uses explicit x and y mapping', () => {
    const data = [
      { date: '2025-01', revenue: 1000, cost: 600 },
      { date: '2025-02', revenue: 1200, cost: 700 },
    ];
    const result = resolveData(data, { x: 'date', y: 'revenue' });
    expect(result.labels).toEqual(['2025-01', '2025-02']);
    expect(result.datasets.length).toBe(1);
    expect(result.datasets[0].data).toEqual([1000, 1200]);
  });

  it('uses multiple y fields', () => {
    const data = [
      { month: 'Jan', a: 10, b: 20, c: 30 },
      { month: 'Feb', a: 15, b: 25, c: 35 },
    ];
    const result = resolveData(data, { x: 'month', y: ['a', 'b', 'c'] });
    expect(result.datasets.length).toBe(3);
    expect(result.datasets[0].label).toBe('a');
    expect(result.datasets[2].data).toEqual([30, 35]);
  });

  it('applies custom series names', () => {
    const data = [{ x: 'A', val: 10 }];
    const result = resolveData(data, {
      x: 'x', y: 'val',
      seriesNames: ['My Series'],
    });
    expect(result.datasets[0].label).toBe('My Series');
  });

  it('handles non-numeric values by parsing', () => {
    const data = [{ label: 'A', value: '42.5' }, { label: 'B', value: 'abc' }];
    const result = resolveData(data, { x: 'label', y: 'value' });
    expect(result.datasets[0].data).toEqual([42.5, 0]);
  });

  it('uses labelField alias', () => {
    const data = [{ id: 1, category: 'X', value: 100 }];
    const result = resolveData(data, { labelField: 'category', y: 'value' });
    expect(result.labels).toEqual(['X']);
  });

  it('handles objects with no string fields', () => {
    const data = [{ a: 1, b: 2 }, { a: 3, b: 4 }];
    const result = resolveData(data, {});
    // First key becomes label, rest become values
    expect(result.labels).toEqual(['1', '3']);
    expect(result.datasets.length).toBe(1);
    expect(result.datasets[0].data).toEqual([2, 4]);
  });

  it('handles single-field objects', () => {
    const data = [{ val: 10 }, { val: 20 }];
    const result = resolveData(data, {});
    expect(result.labels).toEqual(['10', '20']);
    expect(result.datasets.length).toBe(0);
  });
});

describe('lerpColor()', () => {
  it('interpolates linearly between two hex colours', () => {
    expect(lerpColor('#000000', '#ffffff', 0)).toBe('rgb(0,0,0)');
    expect(lerpColor('#000000', '#ffffff', 1)).toBe('rgb(255,255,255)');
    // Halfway is 127 (truncated), not 128.
    expect(lerpColor('#000000', '#ffffff', 0.5)).toBe('rgb(127,127,127)');
  });

  it('clamps t to [0, 1]', () => {
    expect(lerpColor('#000000', '#ffffff', -1)).toBe('rgb(0,0,0)');
    expect(lerpColor('#000000', '#ffffff', 2)).toBe('rgb(255,255,255)');
  });

  it('parses rgb()/rgba() input', () => {
    expect(lerpColor('rgb(0, 0, 0)', 'rgb(100, 100, 100)', 1)).toBe('rgb(100,100,100)');
    expect(lerpColor('rgba(0,0,0,0.5)', 'rgba(255,255,255,0.5)', 1)).toBe('rgb(255,255,255)');
  });

  it('parses 3-digit hex', () => {
    // #f00 → #ff0000
    expect(lerpColor('#000', '#f00', 1)).toBe('rgb(255,0,0)');
  });

  it('does not crash on named colours / hsl() / unfamiliar syntax', () => {
    // The test runner mocks Canvas2D (see tests/setup.ts) so `fillStyle` is
    // a plain string field with no normalisation. In a *real* browser the
    // canvas fallback decodes named colours and hsl() correctly; we can't
    // exercise that path here without a real canvas backend. What we can
    // verify is that lerpColor never crashes on these inputs and always
    // returns a valid `rgb(r,g,b)` string (falling back to black is fine).
    for (const colour of ['red', 'salmon', 'hsl(120, 100%, 50%)', 'oklch(0.7 0.2 200)']) {
      const out = lerpColor('#000000', colour, 1);
      expect(out).toMatch(/^rgb\(\d+,\d+,\d+\)$/);
    }
  });

  it('returns black for empty / unrecognised input (graceful fallback)', () => {
    expect(lerpColor('', '#ffffff', 0)).toBe('rgb(0,0,0)');
    expect(lerpColor('not-a-color', '#ffffff', 0)).toBe('rgb(0,0,0)');
  });
});
