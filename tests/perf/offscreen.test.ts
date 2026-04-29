import { describe, it, expect } from 'vitest';
import { supportsOffscreen, executeCommands, OffscreenRenderer } from '../../src/perf/offscreen';
import type { DrawCommand } from '../../src/perf/offscreen';

describe('supportsOffscreen', () => {
  it('returns false in jsdom (no OffscreenCanvas)', () => {
    // jsdom doesn't have OffscreenCanvas
    expect(supportsOffscreen()).toBe(false);
  });
});

describe('executeCommands', () => {
  it('executes fillRect command', () => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    const commands: DrawCommand[] = [
      { op: 'fillRect', args: ['#ff0000', 0, 0, 100, 100] },
    ];
    expect(() => executeCommands(ctx, commands)).not.toThrow();
  });

  it('executes strokeLine command', () => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    const commands: DrawCommand[] = [
      { op: 'strokeLine', args: ['#00ff00', 2, [0, 100], [0, 100]] },
    ];
    expect(() => executeCommands(ctx, commands)).not.toThrow();
  });

  it('executes fillArc command', () => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    const commands: DrawCommand[] = [
      { op: 'fillArc', args: ['#0000ff', 50, 50, 10] },
    ];
    expect(() => executeCommands(ctx, commands)).not.toThrow();
  });

  it('executes fillText command', () => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    const commands: DrawCommand[] = [
      { op: 'fillText', args: ['#fff', '12px sans-serif', 'Hello', 10, 10, 'left', 'top'] },
    ];
    expect(() => executeCommands(ctx, commands)).not.toThrow();
  });

  it('executes strokePath with bezier', () => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    const commands: DrawCommand[] = [
      {
        op: 'strokePath',
        args: ['#ff0000', 2, [
          { t: 'M', x: 0, y: 0 },
          { t: 'C', cp1x: 10, cp1y: 20, cp2x: 30, cp2y: 40, x: 50, y: 50 },
          { t: 'L', x: 100, y: 100 },
          { t: 'Z' },
        ]],
      },
    ];
    expect(() => executeCommands(ctx, commands)).not.toThrow();
  });

  it('executes fillPath command', () => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    const commands: DrawCommand[] = [
      {
        op: 'fillPath',
        args: ['#00ff00', [
          { t: 'M', x: 10, y: 10 },
          { t: 'L', x: 90, y: 10 },
          { t: 'L', x: 90, y: 90 },
          { t: 'Z' },
        ]],
      },
    ];
    expect(() => executeCommands(ctx, commands)).not.toThrow();
  });

  it('handles empty command list', () => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    expect(() => executeCommands(ctx, [])).not.toThrow();
  });

  it('executes mixed commands in sequence', () => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    const commands: DrawCommand[] = [
      { op: 'fillRect', args: ['#000', 0, 0, 200, 200] },
      { op: 'strokeLine', args: ['#fff', 1, [0, 200], [100, 100]] },
      { op: 'fillArc', args: ['#f00', 100, 100, 5] },
      { op: 'fillText', args: ['#fff', '10px sans-serif', 'Test', 50, 50, 'center', 'middle'] },
    ];
    expect(() => executeCommands(ctx, commands)).not.toThrow();
  });
});

describe('OffscreenRenderer', () => {
  it('reports disabled in jsdom', () => {
    const renderer = new OffscreenRenderer();
    expect(renderer.enabled).toBe(false);
  });

  it('render returns null when disabled', () => {
    const renderer = new OffscreenRenderer();
    const result = renderer.render(100, 100, 1, [
      { op: 'fillRect', args: ['#000', 0, 0, 100, 100] },
    ]);
    expect(result).toBeNull();
  });

  it('destroy is safe to call', () => {
    const renderer = new OffscreenRenderer();
    expect(() => renderer.destroy()).not.toThrow();
    expect(() => renderer.destroy()).not.toThrow();
  });
});
