import { describe, it, expect, beforeEach } from 'vitest';
import { Tooltip } from '../../src/core/tooltip';
import { LineChart } from '../../src/charts';
import { THEMES, addTheme } from '../../src/core/themes';
import type { Theme } from '../../src/types';

/**
 * JSDOM normalizes inline `style.background: #abcdef` into `rgb(171, 205, 239)`,
 * so the original hex never survives the round-trip. Build a regex that matches
 * either form so the assertions don't depend on the renderer.
 */
function hexOrRgb(hex: string): RegExp {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const escapedHex = hex.toLowerCase();
  // JSDOM emits `rgb(r, g, b)` for opaque hex and `rgba(r, g, b, a)` when an
  // alpha suffix was present on the input (e.g. `#0f1620f2`).
  return new RegExp(`(${escapedHex}|rgba?\\(\\s*${r}\\s*,\\s*${g}\\s*,\\s*${b}[^)]*\\))`, 'i');
}

function makeCanvas(): HTMLCanvasElement {
  const c = document.createElement('canvas');
  document.body.appendChild(c);
  return c;
}

function makeContainer(): HTMLDivElement {
  const d = document.createElement('div');
  d.style.cssText = 'width:600px;height:400px';
  document.body.appendChild(d);
  return d;
}

function clearBody(): void {
  while (document.body.firstChild) document.body.removeChild(document.body.firstChild);
}

describe('Tooltip theming', () => {
  let canvas: HTMLCanvasElement;
  beforeEach(() => {
    clearBody();
    canvas = makeCanvas();
  });

  it('falls back to built-in panel colours when no theme is supplied', () => {
    const tt = new Tooltip(canvas);
    tt.show(0, 0, 'hi');
    // The default fallback is #0f1620f2 — the alpha suffix is stripped by JSDOM
    // when normalising into rgba(...), so just check the RGB triplet survives.
    expect(tt.el!.style.cssText).toMatch(hexOrRgb('#0f1620'));
    tt.destroy();
  });

  it('derives panel colours from theme.surface / .axis / .text when overrides are absent', () => {
    const tt = new Tooltip(canvas, THEMES.arctic);
    tt.show(0, 0, 'hi');
    const css = tt.el!.style.cssText;
    expect(css).toMatch(hexOrRgb('#f8fafc')); // arctic.surface → tooltip bg
    expect(css).toMatch(hexOrRgb('#cbd5e1')); // arctic.axis    → tooltip border
    expect(css).toMatch(hexOrRgb('#1e293b')); // arctic.text    → tooltip text
    tt.destroy();
  });

  it('explicit tooltipBg / tooltipBorder / tooltipText override the derived defaults', () => {
    const custom: Theme = {
      ...THEMES.arctic,
      tooltipBg: '#112233',
      tooltipBorder: '#445566',
      tooltipText: '#778899',
    };
    const tt = new Tooltip(canvas, custom);
    tt.showStructured(0, 0, {
      title: 't',
      rows: [{ label: 'a', value: 'b' }],
      footer: 'f',
    });
    const css = tt.el!.style.cssText;
    expect(css).toMatch(hexOrRgb('#112233'));
    expect(css).toMatch(hexOrRgb('#445566'));
    expect(css).toMatch(hexOrRgb('#778899'));
    tt.destroy();
  });

  it('setTheme() updates panel colours on an existing tooltip', () => {
    const tt = new Tooltip(canvas, THEMES.midnight);
    tt.show(0, 0, 'hi');
    expect(tt.el!.style.cssText).toMatch(hexOrRgb('#1a1f28')); // midnight.surface

    tt.setTheme(THEMES.arctic);
    expect(tt.el!.style.cssText).toMatch(hexOrRgb('#f8fafc')); // arctic.surface
    tt.destroy();
  });

  it('BaseChart pushes its theme into Tooltip on construction', () => {
    const chart = new LineChart(makeContainer(), { theme: 'arctic' });
    chart.setData([{ x: 1, y: 2 }, { x: 2, y: 3 }]);
    expect(chart.tooltip).not.toBeNull();
    expect(chart.tooltip!.el!.style.cssText).toMatch(hexOrRgb('#f8fafc'));
    chart.destroy();
  });

  it('BaseChart.setTheme() repaints the tooltip in the new theme', () => {
    const chart = new LineChart(makeContainer(), { theme: 'midnight' });
    chart.setData([{ x: 1, y: 2 }, { x: 2, y: 3 }]);
    expect(chart.tooltip!.el!.style.cssText).toMatch(hexOrRgb('#1a1f28'));

    chart.setTheme('arctic');
    expect(chart.tooltip!.el!.style.cssText).toMatch(hexOrRgb('#f8fafc'));
    chart.destroy();
  });

  it('BaseChart.update({ theme }) propagates a custom theme into the tooltip', () => {
    addTheme('tt-test', {
      ...THEMES.midnight,
      tooltipBg: '#abcdef',
      tooltipBorder: '#fedcba',
      tooltipText: '#0b0c0d',
    });
    const chart = new LineChart(makeContainer(), { theme: 'tt-test' });
    chart.setData([{ x: 1, y: 2 }]);
    const css = chart.tooltip!.el!.style.cssText;
    expect(css).toMatch(hexOrRgb('#abcdef'));
    expect(css).toMatch(hexOrRgb('#fedcba'));
    expect(css).toMatch(hexOrRgb('#0b0c0d'));
    chart.destroy();
  });
});
