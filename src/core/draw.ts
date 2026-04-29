/**
 * Composable Canvas drawing primitives.
 *
 * Every chart in the library was repeating a handful of patterns: pick the
 * series colour, project a value onto the Y axis, draw a rounded bar, light
 * up a shadow on hover. Factoring these into small functions keeps each
 * chart's `_draw` focused on its *unique* shape, shrinks the bundle (similar
 * call sites compress better than duplicated bodies), and gives library
 * consumers reusable building blocks for custom chart types.
 *
 * All functions are tree-shakable — none reference the global instance,
 * none reach back into a class. Pass what you need.
 */

import type { Dataset, NiceScale, PlotArea, Theme } from '../types';
import { hexToRgba, safeDim, safeRadius } from '../utils/helpers';

// ─── Series colour ──────────────────────────────────────────────────────

/**
 * Resolve the colour for a series. Honours `dataset.color` overrides; otherwise
 * cycles through the theme palette modulo length so charts with more series
 * than colours still get something.
 */
export function seriesColor(theme: Theme, ds: Dataset | undefined, idx: number): string {
  if (ds?.color) return ds.color;
  return theme.colors[idx % theme.colors.length];
}

// ─── Value projections ──────────────────────────────────────────────────

/**
 * Build a `value → y pixel` projection for a vertical chart whose Y axis
 * runs bottom→top across `plotArea.h` and matches `scale.[min,max]`.
 *
 * `t` is the animation progress (0 → 1). At t = 0 every projection collapses
 * to the bottom of the plot area for a clean entry animation.
 */
export function yProj(
  scale: NiceScale,
  plotArea: PlotArea,
  t = 1,
): (value: number) => number {
  const range = scale.max - scale.min || 1;
  return (v: number) =>
    plotArea.y + plotArea.h - ((v - scale.min) / range) * plotArea.h * t;
}

/**
 * Build a `value → x pixel` projection for a horizontal chart whose X axis
 * runs left→right across `plotArea.w`.
 */
export function xProj(
  scale: NiceScale,
  plotArea: PlotArea,
  t = 1,
): (value: number) => number {
  const range = scale.max - scale.min || 1;
  return (v: number) =>
    plotArea.x + ((v - scale.min) / range) * plotArea.w * t;
}

// ─── Hover glow ─────────────────────────────────────────────────────────

/**
 * Apply the canvas-level "hover glow" used by every interactive chart in the
 * library. Call once before the fill/stroke; pair with {@link clearHoverGlow}
 * (or set `shadowBlur = 0`) afterwards so the shadow doesn't bleed into the
 * next draw.
 *
 * `intensity` controls both the shadow alpha (`0.3 × intensity`) and blur
 * radius (`12 × intensity`); 1 is the default everywhere in the library.
 */
export function applyHoverGlow(
  ctx: CanvasRenderingContext2D,
  color: string,
  intensity = 1,
): void {
  ctx.shadowColor = hexToRgba(color, 0.3 * intensity);
  ctx.shadowBlur = 12 * intensity;
}

/** Reset the canvas shadow. */
export function clearHoverGlow(ctx: CanvasRenderingContext2D): void {
  ctx.shadowBlur = 0;
}

// ─── Rounded bar ────────────────────────────────────────────────────────

export interface RoundedBarOpts {
  /** Per-corner radii [topLeft, topRight, bottomRight, bottomLeft]. */
  radii?: number | [number, number, number, number];
  /** Light up the hover-glow drop shadow during this draw. */
  hover?: boolean;
  /** Glow / shadow colour. Defaults to the fill colour. */
  glowColor?: string;
}

/**
 * Draw a filled bar with optional rounded corners and hover glow. Used by
 * BarChart, HBarChart, ComboChart, StackedBarChart, BulletChart, and any
 * other rectangle-based chart.
 *
 * Use this instead of raw `fillRect` so all rectangle-based charts share
 * the same visual language without each one re-implementing rounded corners
 * and hover treatment.
 */
export function roundedBar(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  fill: string,
  opts: RoundedBarOpts = {},
): void {
  const dimW = safeDim(w);
  const dimH = safeDim(h);
  if (dimW === 0 || dimH === 0) return;

  let radii: number | [number, number, number, number];
  if (opts.radii === undefined) {
    radii = 0;
  } else if (typeof opts.radii === 'number') {
    radii = safeRadius(Math.min(opts.radii, dimW / 2, dimH / 2));
  } else {
    const cap = Math.min(dimW / 2, dimH / 2);
    radii = [
      safeRadius(Math.min(opts.radii[0], cap)),
      safeRadius(Math.min(opts.radii[1], cap)),
      safeRadius(Math.min(opts.radii[2], cap)),
      safeRadius(Math.min(opts.radii[3], cap)),
    ];
  }

  ctx.fillStyle = fill;
  if (opts.hover) applyHoverGlow(ctx, opts.glowColor ?? fill);
  ctx.beginPath();
  ctx.roundRect(x, y, dimW, dimH, radii as any);
  ctx.fill();
  if (opts.hover) clearHoverGlow(ctx);
}
