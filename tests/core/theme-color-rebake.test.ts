/**
 * Regression: issue #21 — `colorField` / `colorMap` per-datum colours were
 * baked at `setData` time using the active theme palette and never recomputed
 * when the theme changed. After `setTheme()` or `update({ theme })`, charts
 * kept the old palette indefinitely.
 *
 * The fix introduces `_rebakeColorsForTheme()` on `BaseChart`, called from
 * both theme-change paths, and three subclasses (Pie, Funnel, Treemap)
 * override it to redo their own bake without re-animating.
 */
import { describe, it, expect } from 'vitest';
import {
  BarChart, LineChart, HBarChart, PieChart, FunnelChart, TreemapChart,
} from '../../src/charts';
import { addTheme, THEMES } from '../../src/core/themes';

function host(): HTMLDivElement {
  const d = document.createElement('div');
  d.style.cssText = 'width:600px;height:400px';
  document.body.appendChild(d);
  return d;
}

// Two themes with disjoint palettes so we can tell which one was used.
addTheme('rebake-a', {
  bg: '#000', surface: '#111', grid: '#222', text: '#fff',
  textMuted: '#999', axis: '#333',
  colors: ['#aa0000', '#aa1111', '#aa2222', '#aa3333', '#aa4444', '#aa5555'],
});
addTheme('rebake-b', {
  bg: '#fff', surface: '#fafafa', grid: '#eee', text: '#000',
  textMuted: '#666', axis: '#ccc',
  colors: ['#0000bb', '#1111bb', '#2222bb', '#3333bb', '#4444bb', '#5555bb'],
});

const rows = [
  { name: 'r1', count: 10, status: 'ok' },
  { name: 'r2', count: 20, status: 'warn' },
  { name: 'r3', count: 30, status: 'err' },
];

describe('colorField/colorMap rebakes on theme change', () => {
  it('Bar (base resolveData path) — setTheme switches per-datum colours', () => {
    const chart = new BarChart(host(), { animate: false, theme: 'rebake-a' });
    chart.setData(rows, { x: 'name', y: 'count', colorField: 'status' });

    const baked0 = chart.resolved.datasets[0].colors!.slice();
    expect(baked0.every(c => c?.startsWith('#aa'))).toBe(true);

    chart.setTheme('rebake-b');

    const baked1 = chart.resolved.datasets[0].colors!.slice();
    expect(baked1.every(c => c?.startsWith('#0') || c?.startsWith('#1') ||
                             c?.startsWith('#2') || c?.startsWith('#3') ||
                             c?.startsWith('#4') || c?.startsWith('#5'))).toBe(true);
    expect(baked1).not.toEqual(baked0);
    chart.destroy();
  });

  it('Line (base resolveData path) — update({ theme }) switches per-datum colours', () => {
    const chart = new LineChart(host(), { animate: false, theme: 'rebake-a' });
    chart.setData(rows, { x: 'name', y: 'count', colorField: 'status' });
    const before = chart.resolved.datasets[0].colors!.slice();

    chart.update({ theme: 'rebake-b' });

    const after = chart.resolved.datasets[0].colors!.slice();
    expect(after).not.toEqual(before);
    chart.destroy();
  });

  it('HBar (base path) — colorMap entries take precedence; hashed values rebake', () => {
    const chart = new HBarChart(host(), { animate: false, theme: 'rebake-a' });
    // 'ok' is fixed via colorMap (must NOT change), 'warn'/'err' fall through to the palette.
    chart.setData(rows, {
      x: 'name', y: 'count',
      colorField: 'status',
      colorMap: { ok: '#123456' },
    });
    const before = chart.resolved.datasets[0].colors!.slice();
    expect(before[0]).toBe('#123456');

    chart.setTheme('rebake-b');

    const after = chart.resolved.datasets[0].colors!.slice();
    expect(after[0]).toBe('#123456');               // colorMap hit unchanged
    expect(after[1]).not.toBe(before[1]);           // hashed → rebaked
    expect(after[2]).not.toBe(before[2]);
    chart.destroy();
  });

  it('Pie — per-slice colours rebake on setTheme', () => {
    const chart = new PieChart(host(), { animate: false, theme: 'rebake-a' });
    chart.setData(rows, { labelField: 'name', valueField: 'count', colorField: 'status' });
    const before = chart.resolved.datasets[0].colors!.slice();
    expect(before.every(c => c?.startsWith('#aa'))).toBe(true);

    chart.setTheme('rebake-b');

    const after = chart.resolved.datasets[0].colors!.slice();
    expect(after).not.toEqual(before);
    chart.destroy();
  });

  it('Funnel — per-stage colours rebake (verified via _datumColor)', () => {
    const chart = new FunnelChart(host(), { animate: false, theme: 'rebake-a' });
    chart.setData(rows, { labelField: 'name', valueField: 'count', colorField: 'status' });

    const c = chart as unknown as { _datumColor(i: number): string };
    const before = [c._datumColor(0), c._datumColor(1), c._datumColor(2)];
    expect(before.every(x => x.startsWith('#aa'))).toBe(true);

    chart.setTheme('rebake-b');

    const after = [c._datumColor(0), c._datumColor(1), c._datumColor(2)];
    expect(after).not.toEqual(before);
    chart.destroy();
  });

  it('Treemap — per-tile colours rebake', () => {
    const chart = new TreemapChart(host(), { animate: false, theme: 'rebake-a' });
    chart.setData(rows, { labelField: 'name', valueField: 'count', colorField: 'status' });

    const c = chart as unknown as { _datumColor(i: number): string };
    const before = [c._datumColor(0), c._datumColor(1), c._datumColor(2)];
    expect(before.every(x => x.startsWith('#aa'))).toBe(true);

    chart.update({ theme: 'rebake-b' });

    const after = [c._datumColor(0), c._datumColor(1), c._datumColor(2)];
    expect(after).not.toEqual(before);
    chart.destroy();
  });

  it('charts WITHOUT colorField are not disturbed by rebake on theme change', () => {
    const chart = new BarChart(host(), { animate: false, theme: 'rebake-a' });
    chart.setData(rows, { x: 'name', y: 'count' });
    expect(chart.resolved.datasets[0].colors).toBeUndefined();

    chart.setTheme('rebake-b');

    expect(chart.resolved.datasets[0].colors).toBeUndefined();
    chart.destroy();
  });

  it('pre-built {labels, datasets} path — rebake does not clobber consumer-owned data', () => {
    const chart = new BarChart(host(), { animate: false, theme: 'rebake-a' });
    chart.setData(undefined, {
      labels: ['a', 'b'],
      datasets: [{ label: 'series', data: [1, 2], color: '#deadbe' }],
    });
    const before = chart.resolved.datasets[0];

    chart.setTheme('rebake-b');

    expect(chart.resolved.datasets[0]).toBe(before);
    expect(chart.resolved.datasets[0].color).toBe('#deadbe');
    chart.destroy();
  });

  it('regression: subclasses that override setData but do not bake colours are unaffected', () => {
    // Use a built-in theme (midnight) so colors are fully populated and the
    // smoke test exercises the non-rebake path on a non-base setData chart.
    expect(THEMES.midnight.colors.length).toBeGreaterThan(0);
    const chart = new TreemapChart(host(), { animate: false, theme: 'midnight' });
    chart.setData(
      [{ label: 'a', value: 5 }, { label: 'b', value: 10 }],
      { labelField: 'label', valueField: 'value' }, // no colorField
    );
    expect(() => chart.setTheme('arctic')).not.toThrow();
    expect(() => chart.update({ theme: 'midnight' })).not.toThrow();
    chart.destroy();
  });
});
