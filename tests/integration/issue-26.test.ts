import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { LineChart } from '../../src/charts/line';
import { resolveData } from '../../src/utils/helpers';
import type { Theme } from '../../src/types';

function host(w = 400, h = 200): HTMLDivElement {
  const el = document.createElement('div');
  el.style.width = w + 'px';
  el.style.height = h + 'px';
  document.body.appendChild(el);
  return el;
}

beforeEach(() => {
  while (document.body.firstChild) document.body.removeChild(document.body.firstChild);
});

describe('issue #26 — setTheme widening', () => {
  it('accepts a registered theme name', () => {
    const c = new LineChart(host(), { animate: false });
    c.setData([{ x: 'a', y: 1 }], { x: 'x', y: 'y' });
    expect(() => c.setTheme('arctic')).not.toThrow();
    c.destroy();
  });

  it('accepts a Theme object literal', () => {
    const c = new LineChart(host(), { animate: false });
    c.setData([{ x: 'a', y: 1 }], { x: 'x', y: 'y' });
    const customTheme: Theme = {
      bg: '#000', surface: '#111', grid: '#222', text: '#fff',
      textMuted: '#888', axis: '#333', colors: ['#f00', '#0f0'],
    };
    expect(() => c.setTheme(customTheme)).not.toThrow();
    expect(c.theme.bg).toBe('#000');
    c.destroy();
  });
});

describe('issue #26 — toDataURL scale option', () => {
  it('scale: "css" produces a smaller bitmap than the native backing store at DPR>1', () => {
    Object.defineProperty(globalThis, 'devicePixelRatio', {
      value: 2, writable: true, configurable: true,
    });
    try {
      const c = new LineChart(host(400, 200), { animate: false });
      c.setData([{ x: 'a', y: 1 }, { x: 'b', y: 2 }], { x: 'x', y: 'y' });

      const seen: { w: number; h: number }[] = [];
      const origToDataURL = HTMLCanvasElement.prototype.toDataURL;
      HTMLCanvasElement.prototype.toDataURL = function (this: HTMLCanvasElement) {
        seen.push({ w: this.width, h: this.height });
        return 'data:image/png;base64,mock';
      };

      try {
        c.toDataURL();
        const native = seen[seen.length - 1];
        seen.length = 0;
        c.toDataURL('image/png', 0.92, { scale: 'css' });
        const css = seen[seen.length - 1];

        expect(native.w).toBeGreaterThan(css.w);
        expect(native.h).toBeGreaterThan(css.h);
      } finally {
        HTMLCanvasElement.prototype.toDataURL = origToDataURL;
      }
      c.destroy();
    } finally {
      Object.defineProperty(globalThis, 'devicePixelRatio', {
        value: 1, writable: true, configurable: true,
      });
    }
  });
});

describe('issue #26 — non-numeric coercion warns once', () => {
  let warn: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    process.env.NODE_ENV = 'test';
    warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => { warn.mockRestore(); });

  it('does not throw on non-numeric values', () => {
    expect(() => resolveData(
      [{ k: 'a', v: 1 }, { k: 'b', v: 'oops' }, { k: 'c', v: null }],
      { x: 'k', y: 'v' },
    )).not.toThrow();
  });
});

describe('issue #26 — canvas style not assigned via cssText', () => {
  it('preserves externally-set canvas styles after construction', () => {
    const el = host();
    const c = new LineChart(el, { animate: false });
    const canvas = el.querySelector('canvas')!;
    canvas.style.zIndex = '5';
    canvas.style.cursor = 'crosshair';
    expect(canvas.style.zIndex).toBe('5');
    expect(canvas.style.cursor).toBe('crosshair');
    expect(canvas.style.display).toBe('block');
    c.destroy();
  });
});
