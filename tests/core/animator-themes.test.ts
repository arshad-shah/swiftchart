import { describe, it, expect, vi } from 'vitest';
import { Animator, EASINGS } from '../../src/core/animator';
import { THEMES, resolveTheme, addTheme } from '../../src/core/themes';

// ═══════════════════════════════════════════════════════
// Animator
// ═══════════════════════════════════════════════════════
describe('Animator', () => {
  it('initialises with defaults', () => {
    const a = new Animator();
    expect(a.duration).toBe(600);
    expect(a.easing).toBe('easeOutCubic');
    expect(a.progress).toBe(0);
    expect(a.running).toBe(false);
  });

  it('initialises with custom values', () => {
    const a = new Animator(1000, 'easeOutElastic');
    expect(a.duration).toBe(1000);
    expect(a.easing).toBe('easeOutElastic');
  });

  it('calls onFrame during animation', async () => {
    const a = new Animator(50, 'linear');
    const onFrame = vi.fn();
    a.start(onFrame);
    // Wait for microtask queue to flush (our mock rAF uses Promise.resolve)
    await new Promise(r => setTimeout(r, 100));
    expect(onFrame).toHaveBeenCalled();
    expect(onFrame.mock.calls[0][0]).toBeGreaterThanOrEqual(0);
  });

  it('can be stopped', () => {
    const a = new Animator(1000);
    const onFrame = vi.fn();
    a.start(onFrame);
    a.stop();
    expect(a.running).toBe(false);
  });

  it('stop before start is safe', () => {
    const a = new Animator();
    expect(() => a.stop()).not.toThrow();
  });

  it('multiple starts stop previous animation', () => {
    const a = new Animator(1000);
    const onFrame1 = vi.fn();
    const onFrame2 = vi.fn();
    a.start(onFrame1);
    a.start(onFrame2);
    expect(a.running).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════
// Easings
// ═══════════════════════════════════════════════════════
describe('EASINGS', () => {
  const names = Object.keys(EASINGS) as (keyof typeof EASINGS)[];

  names.forEach(name => {
    describe(name, () => {
      it('returns 0 at t=0', () => {
        expect(EASINGS[name](0)).toBeCloseTo(0, 5);
      });

      it('returns 1 at t=1', () => {
        expect(EASINGS[name](1)).toBeCloseTo(1, 5);
      });

      it('returns values between ~0 and ~2 for t in [0,1]', () => {
        for (let t = 0; t <= 1; t += 0.1) {
          const v = EASINGS[name](t);
          // Some easings overshoot (easeOutBack, easeOutElastic)
          expect(v).toBeGreaterThanOrEqual(-0.5);
          expect(v).toBeLessThanOrEqual(2);
        }
      });

      it('is monotonically approaching 1 near end', () => {
        const v09 = EASINGS[name](0.9);
        const v1 = EASINGS[name](1);
        expect(v09).toBeLessThanOrEqual(v1 + 0.1); // Allow slight overshoot
      });
    });
  });
});

// ═══════════════════════════════════════════════════════
// Themes
// ═══════════════════════════════════════════════════════
describe('Themes', () => {
  it('has all built-in themes', () => {
    expect(THEMES).toHaveProperty('midnight');
    expect(THEMES).toHaveProperty('arctic');
    expect(THEMES).toHaveProperty('ember');
    expect(THEMES).toHaveProperty('forest');
  });

  it('each theme has required properties', () => {
    Object.values(THEMES).forEach(theme => {
      expect(theme).toHaveProperty('bg');
      expect(theme).toHaveProperty('surface');
      expect(theme).toHaveProperty('grid');
      expect(theme).toHaveProperty('text');
      expect(theme).toHaveProperty('textMuted');
      expect(theme).toHaveProperty('axis');
      expect(theme).toHaveProperty('colors');
      expect(Array.isArray(theme.colors)).toBe(true);
      expect(theme.colors.length).toBeGreaterThanOrEqual(5);
    });
  });

  it('each theme colour is a valid hex string', () => {
    Object.values(THEMES).forEach(theme => {
      theme.colors.forEach(color => {
        expect(color).toMatch(/^#[0-9a-fA-F]{6}$/);
      });
    });
  });
});

describe('resolveTheme()', () => {
  it('returns midnight for undefined', () => {
    expect(resolveTheme()).toEqual(THEMES.midnight);
    expect(resolveTheme(undefined)).toEqual(THEMES.midnight);
  });

  it('returns named theme', () => {
    expect(resolveTheme('arctic')).toEqual(THEMES.arctic);
    expect(resolveTheme('ember')).toEqual(THEMES.ember);
  });

  it('returns midnight for unknown name', () => {
    expect(resolveTheme('nonexistent')).toEqual(THEMES.midnight);
  });

  it('returns custom theme object with semantic defaults backfilled', () => {
    const custom = {
      bg: '#000', surface: '#111', grid: '#222',
      text: '#fff', textMuted: '#888', axis: '#333',
      colors: ['#f00', '#0f0', '#00f'],
    };
    const resolved = resolveTheme(custom as any);
    expect(resolved).toMatchObject(custom);
    // Semantic fields should be backfilled if not provided
    expect(resolved.positive).toBeDefined();
    expect(resolved.negative).toBeDefined();
    expect(resolved.onAccent).toBeDefined();
  });

  it('preserves explicit semantic colors', () => {
    const custom = {
      bg: '#000', surface: '#111', grid: '#222',
      text: '#fff', textMuted: '#888', axis: '#333',
      positive: '#0a0', negative: '#a00', onAccent: '#f0f',
      colors: ['#f00'],
    };
    expect(resolveTheme(custom as any)).toEqual(custom);
  });
});

describe('addTheme()', () => {
  it('registers a new theme', () => {
    addTheme('custom', {
      bg: '#000', surface: '#111', grid: '#222',
      text: '#fff', textMuted: '#888', axis: '#333',
      colors: ['#f00'],
    });
    expect(THEMES['custom']).toBeDefined();
    expect(resolveTheme('custom')!.bg).toBe('#000');
    // Cleanup
    delete THEMES['custom'];
  });

  it('overwrites existing theme', () => {
    const original = { ...THEMES.midnight };
    addTheme('midnight', { ...original, bg: '#999' });
    expect(THEMES.midnight.bg).toBe('#999');
    // Restore
    THEMES.midnight = original;
  });
});
