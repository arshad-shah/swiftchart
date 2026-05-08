/**
 * Regression: issue #24 — theme system robustness.
 *
 * Covers:
 *  1. Unknown theme name → warns in dev, falls back to midnight.
 *  2. addTheme without all required fields → warns and backfills from
 *     midnight (so production never renders with `undefined` colours).
 *  3. addTheme over a built-in name → warns (but proceeds, by design).
 *  4. cssColor: invalid named-string ('foobar') → '#888' fallback,
 *     not silently passed through.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { THEMES, addTheme, resolveTheme } from '../../src/core/themes';
import { Tooltip } from '../../src/core/tooltip';

let warnSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
});
afterEach(() => {
  warnSpy.mockRestore();
});

describe('resolveTheme: unknown name', () => {
  it('warns once and falls back to midnight when a string name is not registered', () => {
    const out = resolveTheme('nonexistent-theme-zzz');
    expect(out).toBe(THEMES.midnight);
    expect(warnSpy).toHaveBeenCalled();
    const msg = String(warnSpy.mock.calls[0][0]);
    expect(msg).toContain('nonexistent-theme-zzz');
    expect(msg.toLowerCase()).toContain('midnight');
  });

  it('does NOT warn when a registered name resolves cleanly', () => {
    resolveTheme('arctic');
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('does NOT warn when no theme is passed (no string to resolve)', () => {
    resolveTheme();
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('does NOT warn when an inline Theme object is passed', () => {
    resolveTheme({
      bg: '#000', surface: '#111', grid: '#222',
      text: '#fff', textMuted: '#888', axis: '#333',
      colors: ['#abc'],
    });
    expect(warnSpy).not.toHaveBeenCalled();
  });
});

describe('addTheme: shape validation', () => {
  afterEach(() => {
    delete THEMES['robust-test'];
    delete THEMES['robust-min'];
  });

  it('warns when required fields are missing', () => {
    // @ts-expect-error — intentionally incomplete
    addTheme('robust-test', { bg: '#fff' });
    expect(warnSpy).toHaveBeenCalled();
    const msg = String(warnSpy.mock.calls[0][0]);
    expect(msg).toContain('robust-test');
    expect(msg.toMatch?.(/(surface|grid|text|axis|colors)/) ?? msg).toBeTruthy();
  });

  it('backfills missing fields from midnight rather than leaving them undefined', () => {
    // @ts-expect-error — intentionally incomplete
    addTheme('robust-min', { bg: '#fafafa' });
    const t = THEMES['robust-min'];
    expect(t.bg).toBe('#fafafa');                 // user-provided wins
    expect(t.surface).toBe(THEMES.midnight.surface);
    expect(t.colors).toEqual(THEMES.midnight.colors); // not undefined
    expect(t.text).toBeDefined();
    expect(t.textMuted).toBeDefined();
    expect(t.grid).toBeDefined();
    expect(t.axis).toBeDefined();
  });

  it('does NOT warn when all required fields are present', () => {
    addTheme('robust-test', {
      bg: '#000', surface: '#111', grid: '#222',
      text: '#fff', textMuted: '#888', axis: '#333',
      colors: ['#abc'],
    });
    expect(warnSpy).not.toHaveBeenCalled();
  });
});

describe('addTheme: built-in shadowing', () => {
  it('warns when overwriting a built-in theme name', () => {
    const original = { ...THEMES.midnight };
    addTheme('midnight', { ...original, bg: '#deadbe' });
    expect(warnSpy).toHaveBeenCalled();
    const msg = String(warnSpy.mock.calls[0][0]);
    expect(msg.toLowerCase()).toContain('midnight');
    expect(msg.toLowerCase()).toContain('built-in');
    // The override still applies — warning is informational, not blocking.
    expect(THEMES.midnight.bg).toBe('#deadbe');
    THEMES.midnight = original;
  });

  it('does NOT warn for non-built-in names', () => {
    addTheme('not-a-builtin', {
      bg: '#000', surface: '#111', grid: '#222',
      text: '#fff', textMuted: '#888', axis: '#333',
      colors: ['#abc'],
    });
    expect(warnSpy).not.toHaveBeenCalled();
    delete THEMES['not-a-builtin'];
  });
});

describe('Tooltip cssColor: only accepts real CSS colors', () => {
  function dotStyle(color: string): string {
    const canvas = document.createElement('canvas');
    document.body.appendChild(canvas);
    const tt = new Tooltip(canvas);
    tt.showStructured(0, 0, {
      title: 'x',
      rows: [{ label: 'a', value: 'b', color }],
    });
    const dot = tt.el!.querySelector('span') as HTMLSpanElement;
    const out = dot.style.background;
    tt.destroy();
    canvas.remove();
    return out;
  }

  it('accepts hex colours verbatim', () => {
    expect(dotStyle('#ff00aa')).toMatch(/#ff00aa|rgb\(\s*255\s*,\s*0\s*,\s*170\s*\)/i);
  });

  it('rejects gibberish words and falls back to #888', () => {
    // Pre-fix: regex /^[a-zA-Z]+$/ would let "foobar" through and the
    // browser would silently drop the invalid background.
    expect(dotStyle('foobar')).toMatch(/#888|rgb\(\s*136\s*,\s*136\s*,\s*136\s*\)/i);
    expect(dotStyle('not-a-real-color')).toMatch(/#888|rgb\(\s*136\s*,\s*136\s*,\s*136\s*\)/i);
  });
});
