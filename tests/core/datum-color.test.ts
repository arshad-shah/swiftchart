import { describe, it, expect } from 'vitest';
import { datumColor, seriesColor } from '../../src/core/draw';
import { isColorString, hashStr, resolveData } from '../../src/utils/helpers';
import type { Dataset, Theme } from '../../src/types';

const theme: Theme = {
  bg: '#000', surface: '#111', grid: '#222', text: '#fff', textMuted: '#888',
  axis: '#444', positive: '#0f0', negative: '#f00', onAccent: '#000',
  colors: ['#aaa', '#bbb', '#ccc', '#ddd'],
};

const ds = (over: Partial<Dataset> = {}): Dataset => ({
  label: 's', data: [1, 2, 3, 4], ...over,
});

describe('datumColor() precedence', () => {
  it('falls back to theme palette by series index when no overrides exist', () => {
    expect(datumColor(theme, ds(), 0, 2)).toBe('#aaa');
    expect(datumColor(theme, ds(), 1, 0)).toBe('#bbb');
    expect(datumColor(theme, ds(), 5, 0)).toBe('#bbb'); // 5 % 4 = 1
  });

  it('uses paletteIdx override when supplied (pie / treemap pattern)', () => {
    // Single series (seriesIdx=0), palette cycles by datum index.
    expect(datumColor(theme, ds(), 0, 0, undefined, 0)).toBe('#aaa');
    expect(datumColor(theme, ds(), 0, 1, undefined, 1)).toBe('#bbb');
    expect(datumColor(theme, ds(), 0, 2, undefined, 2)).toBe('#ccc');
    expect(datumColor(theme, ds(), 0, 5, undefined, 5)).toBe('#bbb'); // 5 % 4
  });

  it('uses Dataset.color when set, palette is ignored', () => {
    expect(datumColor(theme, ds({ color: '#fff' }), 2, 1)).toBe('#fff');
  });

  it('Dataset.colors[i] beats Dataset.color', () => {
    const d = ds({ color: '#fff', colors: ['#1', '#2', '#3', '#4'] });
    expect(datumColor(theme, d, 0, 2)).toBe('#3');
  });

  it('skips falsy entries in Dataset.colors', () => {
    const d = ds({ color: '#fff', colors: [undefined, '#x', undefined, '#y'] });
    expect(datumColor(theme, d, 0, 0)).toBe('#fff');
    expect(datumColor(theme, d, 0, 1)).toBe('#x');
  });

  it('colorFn beats every other layer when it returns truthy', () => {
    const d = ds({ color: '#fff', colors: ['#1', '#2', '#3', '#4'] });
    const fn = () => '#nope';
    expect(datumColor(theme, d, 0, 1, fn)).toBe('#nope');
  });

  it('colorFn returning undefined falls through', () => {
    const d = ds({ color: '#fff' });
    const fn = (_v: number, i: number) => (i === 0 ? '#hi' : undefined);
    expect(datumColor(theme, d, 0, 0, fn)).toBe('#hi');
    expect(datumColor(theme, d, 0, 1, fn)).toBe('#fff');
  });

  it('passes value/idx/series/dataset to colorFn', () => {
    const d = ds({ data: [10, 20, 30] });
    let captured: any[] = [];
    datumColor(theme, d, 7, 1, (...args) => { captured = args; return undefined; });
    expect(captured[0]).toBe(20);
    expect(captured[1]).toBe(1);
    expect(captured[2]).toBe(7);
    expect(captured[3]).toBe(d);
  });
});

describe('seriesColor() back-compat', () => {
  it('matches datumColor when no per-datum data is set', () => {
    expect(seriesColor(theme, ds(), 2)).toBe(datumColor(theme, ds(), 2, 0));
    expect(seriesColor(theme, ds({ color: '#z' }), 0)).toBe('#z');
  });
});

describe('isColorString()', () => {
  it.each([
    ['#abc', true],
    ['#aabbcc', true],
    ['rgb(1,2,3)', true],
    ['rgba(1,2,3,0.4)', true],
    ['hsl(120 50% 50%)', true],
    ['oklch(0.7 0.1 200)', true],
    ['transparent', true],
    ['ok', false],
    ['warn', false],
    ['', false],
  ])('isColorString(%j) === %s', (input, expected) => {
    expect(isColorString(input)).toBe(expected);
  });
});

describe('hashStr() determinism', () => {
  it('returns the same hash for the same input', () => {
    expect(hashStr('hello')).toBe(hashStr('hello'));
  });

  it('returns different hashes for different inputs', () => {
    expect(hashStr('a')).not.toBe(hashStr('b'));
  });
});

describe('resolveData() with colorField', () => {
  const rows = [
    { name: 'A', count: 10, status: 'ok' },
    { name: 'B', count: 20, status: 'warn' },
    { name: 'C', count: 30, status: 'err' },
  ];

  it('does nothing when colorField is absent', () => {
    const r = resolveData(rows, { x: 'name', y: 'count' }, theme.colors);
    expect(r.datasets[0].colors).toBeUndefined();
  });

  it('uses raw values that look like colours verbatim', () => {
    const r = resolveData(
      [{ x: 'a', y: 1, c: '#abc' }, { x: 'b', y: 2, c: 'rgb(0,0,0)' }],
      { x: 'x', y: 'y', colorField: 'c' },
      theme.colors,
    );
    expect(r.datasets[0].colors).toEqual(['#abc', 'rgb(0,0,0)']);
  });

  it('looks up colorMap entries for categorical fields', () => {
    const r = resolveData(rows, {
      x: 'name', y: 'count', colorField: 'status',
      colorMap: { ok: '#0f0', warn: '#ff0', err: '#f00' },
    }, theme.colors);
    expect(r.datasets[0].colors).toEqual(['#0f0', '#ff0', '#f00']);
  });

  it('hashes unmapped categories deterministically into the palette', () => {
    const r1 = resolveData(rows, { x: 'name', y: 'count', colorField: 'status' }, theme.colors);
    const r2 = resolveData(rows, { x: 'name', y: 'count', colorField: 'status' }, theme.colors);
    expect(r1.datasets[0].colors).toEqual(r2.datasets[0].colors);
    // every entry comes from the palette
    for (const c of r1.datasets[0].colors!) {
      expect(theme.colors).toContain(c);
    }
  });

  it('emits the same colors array across multiple value series', () => {
    const r = resolveData(
      [{ x: 'a', y1: 1, y2: 2, c: '#a' }, { x: 'b', y1: 3, y2: 4, c: '#b' }],
      { x: 'x', y: ['y1', 'y2'], colorField: 'c' },
      theme.colors,
    );
    expect(r.datasets).toHaveLength(2);
    expect(r.datasets[0].colors).toEqual(['#a', '#b']);
    expect(r.datasets[1].colors).toEqual(['#a', '#b']);
  });

  it('returns undefined for null/missing colorField values', () => {
    const r = resolveData(
      [{ x: 'a', y: 1, c: null }, { x: 'b', y: 2, c: undefined }],
      { x: 'x', y: 'y', colorField: 'c' },
      theme.colors,
    );
    expect(r.datasets[0].colors).toEqual([undefined, undefined]);
  });
});
