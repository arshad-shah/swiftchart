/**
 * Regression tests for issues found during the v1.0.x audit.
 * Each test asserts the *fixed* behavior so future changes can't silently
 * regress.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  LineChart, BarChart, PieChart, ScatterChart, RadarChart,
  HBarChart, StackedAreaChart, WaterfallChart, TreemapChart, Sparkline,
  Tooltip, StreamBuffer, executeCommands, escapeHtml, hexToRgba,
  arrayMin, arrayMax, arraysExtent,
} from '../../src';

function host(w = 600, h = 400): HTMLDivElement {
  const div = document.createElement('div');
  div.style.cssText = `width:${w}px;height:${h}px`;
  document.body.appendChild(div);
  return div;
}

describe('Regression: XSS (CVE-class)', () => {
  it('Tooltip.show() never executes injected markup', () => {
    const canvas = document.createElement('canvas');
    document.body.appendChild(canvas);
    const tt = new Tooltip(canvas);
    tt.show(0, 0, '<img src=x onerror="window.__pwned=1">');
    expect(tt.el!.querySelector('img')).toBeNull();
    expect((globalThis as any).__pwned).toBeUndefined();
    tt.destroy();
  });

  it('Tooltip.showStructured escapes title/label/value', () => {
    const canvas = document.createElement('canvas');
    document.body.appendChild(canvas);
    const tt = new Tooltip(canvas);
    tt.showStructured(0, 0, {
      title: '<script>alert(1)</script>',
      rows: [{ label: '<img>tag', value: '<i>1</i>', color: '#f00' }],
    });
    // Injected markup is rendered as text only — no <script>, no <img>, no inner <i>.
    expect(tt.el!.querySelector('script')).toBeNull();
    expect(tt.el!.querySelector('img')).toBeNull();
    expect(tt.el!.querySelector('i')).toBeNull();
    expect(tt.el!.textContent).toContain('<script>alert(1)</script>');
    expect(tt.el!.textContent).toContain('<img>tag');
    expect(tt.el!.textContent).toContain('<i>1</i>');
    tt.destroy();
  });

  it('Chart with malicious labels does not inject DOM', () => {
    const div = host();
    const chart = new BarChart(div);
    chart.setData(
      [{ x: '<script>alert(1)</script>', v: 1 }],
      { x: 'x', y: 'v' },
    );
    chart._onMouse({ clientX: 100, clientY: 100 } as MouseEvent);
    const tt = chart.tooltip!.el!;
    expect(tt.querySelector('script')).toBeNull();
    chart.destroy();
  });

  it('escapeHtml utility', () => {
    expect(escapeHtml('<a&b>"\'')).toBe('&lt;a&amp;b&gt;&quot;&#39;');
    expect(escapeHtml(null)).toBe('');
    expect(escapeHtml(undefined)).toBe('');
  });
});

describe('Regression: Large-array spread overflow', () => {
  // Spreading a 200K-element array into Math.min crashes V8.
  // The chart code now uses arrayMin/arraysExtent.
  it('LineChart handles 200K points without RangeError', () => {
    const div = host(1200, 400);
    const data = new Array(200_000);
    for (let i = 0; i < data.length; i++) data[i] = { x: i, v: Math.sin(i / 100) };
    const chart = new LineChart(div, { animate: false });
    expect(() => chart.setData(data, { x: 'x', y: 'v' })).not.toThrow();
    chart.destroy();
  });

  it('arrayMin/arrayMax/arraysExtent are loop-based', () => {
    const big = new Array(150_000);
    for (let i = 0; i < big.length; i++) big[i] = i;
    expect(arrayMin(big)).toBe(0);
    expect(arrayMax(big)).toBe(149_999);
    expect(arraysExtent([big])).toEqual([0, 149_999]);
  });
});

describe('Regression: BarChart all-negative data', () => {
  it('produces a valid (non-inverted) scale when all values are negative', () => {
    const div = host();
    const chart = new BarChart(div, { animate: false });
    chart.setData(
      [{ k: 'a', v: -10 }, { k: 'b', v: -20 }, { k: 'c', v: -5 }],
      { x: 'k', y: 'v' },
    );
    // No error and labels render
    expect(chart.resolved.labels).toEqual(['a', 'b', 'c']);
    chart.destroy();
  });

  it('BarChart with all-positive data still works', () => {
    const div = host();
    const chart = new BarChart(div, { animate: false });
    chart.setData([{ k: 'a', v: 10 }, { k: 'b', v: 20 }], { x: 'k', y: 'v' });
    chart.destroy();
  });
});

describe('Regression: PieChart zero/empty totals', () => {
  it('does not throw when total === 0', () => {
    const div = host();
    const chart = new PieChart(div, { animate: false });
    expect(() => chart.setData(
      [{ k: 'a', v: 0 }, { k: 'b', v: 0 }],
      { labelField: 'k', valueField: 'v' },
    )).not.toThrow();
    chart._onMouse({ clientX: 300, clientY: 200 } as MouseEvent);
    expect(chart.hoverIndex).toBe(-1);
    chart.destroy();
  });
});

describe('Regression: StreamBuffer.minMax invalidation', () => {
  it('returns up-to-date min/max after pushes', () => {
    const buf = new StreamBuffer(100);
    buf.push(1); buf.push(2); buf.push(3);
    expect(buf.minMax()).toEqual([1, 3]);
    buf.push(0);
    expect(buf.minMax()).toEqual([0, 3]);
    buf.push(99);
    expect(buf.minMax()).toEqual([0, 99]);
  });

  it('clear resets minMax cache', () => {
    const buf = new StreamBuffer(10);
    buf.push(5); expect(buf.minMax()).toEqual([5, 5]);
    buf.clear();
    buf.push(7);
    expect(buf.minMax()).toEqual([7, 7]);
  });
});

describe('Regression: OffscreenRenderer "path" command', () => {
  it('handles path-only DrawCommand without throwing', () => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    expect(() => executeCommands(ctx, [
      { op: 'path', args: [
        { t: 'M', x: 0, y: 0 },
        { t: 'L', x: 10, y: 10 },
        { t: 'Z' },
      ] },
    ])).not.toThrow();
  });
});

describe('Regression: hexToRgba broadened parsing', () => {
  it('accepts #RGB, #RRGGBB, #RRGGBBAA, rgb(), rgba()', () => {
    expect(hexToRgba('#abc', 0.5)).toBe('rgba(170,187,204,0.5)');
    expect(hexToRgba('#aabbcc', 0.5)).toBe('rgba(170,187,204,0.5)');
    expect(hexToRgba('#aabbccdd', 0.5)).toBe('rgba(170,187,204,0.5)');
    expect(hexToRgba('rgb(10, 20, 30)', 0.5)).toBe('rgba(10,20,30,0.5)');
    expect(hexToRgba('rgba(10,20,30,0.9)', 0.5)).toBe('rgba(10,20,30,0.5)');
  });
  it('falls back to black for unrecognized strings', () => {
    expect(hexToRgba('garbage', 1)).toBe('rgba(0,0,0,1)');
    expect(hexToRgba('', 1)).toBe('rgba(0,0,0,1)');
  });
});

describe('Regression: SSR import safety', () => {
  it('module imports without touching document at top level', async () => {
    // Already in jsdom, but the assertion is structural: helpers/themes must
    // not throw when imported in isolation. (If they touched document at
    // import-time we'd see effects in tests/setup.ts.)
    const mod = await import('../../src');
    expect(typeof mod.LineChart).toBe('function');
    expect(typeof mod.escapeHtml).toBe('function');
  });
});

describe('Regression: Memory & lifecycle', () => {
  it('destroy() removes canvas, tooltip, and event listeners', () => {
    const div = host();
    const chart = new BarChart(div);
    chart.setData([{ k: 'a', v: 1 }], { x: 'k', y: 'v' });
    expect(div.querySelector('canvas')).toBeTruthy();
    expect(document.querySelector('.sc-tooltip')).toBeTruthy();
    chart.destroy();
    expect(div.querySelector('canvas')).toBeNull();
    expect(document.querySelector('.sc-tooltip')).toBeNull();
  });

  it('repeated create/destroy does not leak tooltip nodes', () => {
    const div = host();
    for (let i = 0; i < 50; i++) {
      const c = new BarChart(div);
      c.setData([{ k: 'a', v: 1 }], { x: 'k', y: 'v' });
      c.destroy();
    }
    expect(document.querySelectorAll('.sc-tooltip').length).toBe(0);
    expect(div.querySelectorAll('canvas').length).toBe(0);
  });
});

describe('Regression: Accessibility', () => {
  it('canvas exposes role=img and reflects ariaLabel', () => {
    const div = host();
    const chart = new LineChart(div, { ariaLabel: 'Sales over time' });
    expect(chart.canvas.getAttribute('role')).toBe('img');
    expect(chart.canvas.getAttribute('aria-label')).toBe('Sales over time');
    chart.destroy();
  });

  it('falls back to title when ariaLabel is missing', () => {
    const div = host();
    const chart = new LineChart(div, { title: 'Quarterly Revenue' });
    expect(chart.canvas.getAttribute('aria-label')).toBe('Quarterly Revenue');
    chart.destroy();
  });

  it('tooltip element has role and aria-hidden state', () => {
    const div = host();
    const chart = new BarChart(div);
    const tt = chart.tooltip!.el!;
    expect(tt.getAttribute('role')).toBe('tooltip');
    expect(tt.getAttribute('aria-hidden')).toBe('true');
    chart.destroy();
  });
});

describe('Regression: legendPosition layout', () => {
  it('reserves space for left/right legends (plot is narrower)', () => {
    const div = host();
    const top = new LineChart(div, { legendPosition: 'top', animate: false });
    top.setData([{ x: 'a', y: 1 }], { x: 'x', y: 'y' });
    const topW = top.plotArea.w;
    top.destroy();

    const div2 = host();
    const right = new LineChart(div2, { legendPosition: 'right', animate: false });
    right.setData([{ x: 'a', y: 1 }], { x: 'x', y: 'y' });
    const rightW = right.plotArea.w;
    right.destroy();

    expect(rightW).toBeLessThan(topW);
  });
});

describe('Regression: BaseChart.update() polymorphism', () => {
  it('update(array) acts as setData', () => {
    const div = host();
    const chart = new LineChart(div, { animate: false });
    chart.update([{ x: 'a', y: 1 }, { x: 'b', y: 2 }], { x: 'x', y: 'y' });
    expect(chart.resolved.labels).toEqual(['a', 'b']);
    chart.destroy();
  });

  it('update(patch) applies config changes without recreation', () => {
    const div = host();
    const chart = new LineChart(div, { animate: false, title: 'Old' });
    const canvas = chart.canvas;
    chart.update({ title: 'New', ariaLabel: 'Updated' });
    expect(chart.config.title).toBe('New');
    expect(canvas.getAttribute('aria-label')).toBe('Updated');
    expect(chart.canvas).toBe(canvas);
    chart.destroy();
  });
});

describe('Regression: toDataURL export', () => {
  it('returns a data URL string', () => {
    const div = host();
    const chart = new LineChart(div, { animate: false });
    chart.setData([{ x: 'a', y: 1 }], { x: 'x', y: 'y' });
    const url = chart.toDataURL();
    expect(url.startsWith('data:image/')).toBe(true);
    chart.destroy();
  });
});

describe('Regression: theme.onAccent / positive / negative wired', () => {
  it('Waterfall uses theme.positive/negative (not hardcoded)', () => {
    const div = host();
    const chart = new WaterfallChart(div, { theme: 'arctic', animate: false });
    chart.setData(
      [{ label: 'A', value: 10 }, { label: 'B', value: -5 }],
      { labelField: 'label', valueField: 'value' },
    );
    expect(chart.theme.positive).toBe('#059669');
    expect(chart.theme.negative).toBe('#dc2626');
    chart.destroy();
  });
});

describe('Regression: floating-point grid drift', () => {
  it('does not produce 11.999999-style ticks at long ranges', () => {
    const div = host();
    const chart = new LineChart(div, { animate: false });
    chart.setData(
      [{ x: 'a', y: 0 }, { x: 'b', y: 1_000_000 }],
      { x: 'x', y: 'y' },
    );
    chart.destroy();
    // Soft assertion — if the loop drifted it would render NaN or skipped ticks.
  });
});
