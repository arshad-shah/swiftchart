import type { NiceScale, ResolvedData, DataMapping, Dataset } from '../types';

/** Device pixel ratio, capped at 3x. SSR-safe. */
export function dpr(): number {
  if (typeof window === 'undefined') return 1;
  return Math.min(window.devicePixelRatio || 1, 3);
}

/** Linear interpolation */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Clamp value between min and max */
export function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

/**
 * Sanitise a radius value for canvas API calls.
 * The Canvas spec throws RangeError on negative radii. This catches NaN,
 * negative, and Infinity from upstream divide-by-zero or animation overshoot.
 */
export function safeRadius(r: number, max = Infinity): number {
  if (!isFinite(r) || r < 0) return 0;
  return r > max ? max : r;
}

/** Sanitise a non-negative dimension (width / height). */
export function safeDim(v: number): number {
  if (!isFinite(v) || v < 0) return 0;
  return v;
}

/**
 * Loop-based min — safe for huge arrays (avoids Math.min(...arr) call-stack
 * overflow on >100k elements).
 */
export function arrayMin(arr: ArrayLike<number>): number {
  let m = Infinity;
  for (let i = 0; i < arr.length; i++) {
    const v = arr[i];
    if (v < m) m = v;
  }
  return m === Infinity ? 0 : m;
}

/** Loop-based max — safe for huge arrays. */
export function arrayMax(arr: ArrayLike<number>): number {
  let m = -Infinity;
  for (let i = 0; i < arr.length; i++) {
    const v = arr[i];
    if (v > m) m = v;
  }
  return m === -Infinity ? 0 : m;
}

/** Single-pass [min, max] over multiple arrays — avoids flatMap allocation. */
export function arraysExtent(arrs: ArrayLike<number>[]): [number, number] {
  let lo = Infinity, hi = -Infinity;
  for (let a = 0; a < arrs.length; a++) {
    const arr = arrs[a];
    for (let i = 0; i < arr.length; i++) {
      const v = arr[i];
      if (v < lo) lo = v;
      if (v > hi) hi = v;
    }
  }
  if (lo === Infinity) return [0, 0];
  return [lo, hi];
}

/** Compute a "nice" number for axis scale */
export function niceNum(range: number, round: boolean): number {
  const exp = Math.floor(Math.log10(range));
  const frac = range / Math.pow(10, exp);
  let nice: number;
  if (round) {
    nice = frac < 1.5 ? 1 : frac < 3 ? 2 : frac < 7 ? 5 : 10;
  } else {
    nice = frac <= 1 ? 1 : frac <= 2 ? 2 : frac <= 5 ? 5 : 10;
  }
  return nice * Math.pow(10, exp);
}

/** Compute nice axis scale with min, max, step */
export function niceScale(min: number, max: number, ticks = 6): NiceScale {
  if (!isFinite(min) || !isFinite(max)) { min = 0; max = 10; }
  if (min === max) { min -= 1; max += 1; }
  if (min > max) { const t = min; min = max; max = t; }
  const range = niceNum(max - min, false) || 1;
  const step = niceNum(range / (ticks - 1), true) || 1;
  const nMin = Math.floor(min / step) * step;
  const nMax = Math.ceil(max / step) * step;
  return { min: nMin, max: nMax, step };
}

/** Short number formatting (1.2K, 3.4M, etc.) */
export function shortNum(n: number): string {
  if (!isFinite(n)) return '0';
  if (Math.abs(n) >= 1e9) return (n / 1e9).toFixed(1) + 'B';
  if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (Math.abs(n) >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return Number.isInteger(n) ? n.toString() : n.toFixed(1);
}

/**
 * Convert a CSS colour string to rgba.
 * Accepts: #RGB, #RRGGBB, #RRGGBBAA, rgb(r,g,b), rgba(r,g,b,a).
 * Returns rgba() with the requested alpha (overrides any existing alpha).
 */
export function hexToRgba(input: string, a: number): string {
  if (!input) return `rgba(0,0,0,${a})`;
  const s = input.trim();

  if (s.startsWith('#')) {
    let hex = s.slice(1);
    if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
    if (hex.length === 8) hex = hex.slice(0, 6);
    if (hex.length !== 6) return `rgba(0,0,0,${a})`;
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    if (isNaN(r) || isNaN(g) || isNaN(b)) return `rgba(0,0,0,${a})`;
    return `rgba(${r},${g},${b},${a})`;
  }

  const m = s.match(/^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/i);
  if (m) return `rgba(${+m[1]},${+m[2]},${+m[3]},${a})`;

  return `rgba(0,0,0,${a})`;
}

/**
 * Lazily-instantiated 1×1 canvas used to normalise CSS colour strings the
 * fast paths can't decode (named colours, `hsl()`, `oklch()`, `color-mix()`,
 * etc.). The browser's parser is the source of truth, and reading
 * `ctx.fillStyle` back yields a canonical `#hex` or `rgba()` string.
 *
 * SSR-safe: stays `null` when there's no `document`.
 */
let _colourParser: CanvasRenderingContext2D | null | undefined;
function colourParser(): CanvasRenderingContext2D | null {
  if (_colourParser !== undefined) return _colourParser;
  if (typeof document === 'undefined') { _colourParser = null; return null; }
  const c = document.createElement('canvas');
  c.width = c.height = 1;
  _colourParser = c.getContext('2d');
  return _colourParser;
}

/**
 * Parse any CSS colour string into [r, g, b] (alpha discarded).
 * Returns black on parse failure. Hex and `rgb()/rgba()` take a fast path
 * with zero allocations. Anything else (named colours, `hsl(...)`,
 * `oklch(...)`, `color-mix(...)`, etc.) is delegated to the browser via a
 * cached 1×1 canvas, then re-parsed through the fast path.
 */
function parseRgb(input: string): [number, number, number] {
  if (!input) return [0, 0, 0];
  const s = input.trim();
  if (s.startsWith('#')) {
    let hex = s.slice(1);
    if (hex.length === 3) hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    if (hex.length === 8) hex = hex.slice(0, 6);
    if (hex.length !== 6) return [0, 0, 0];
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    return [isNaN(r) ? 0 : r, isNaN(g) ? 0 : g, isNaN(b) ? 0 : b];
  }
  const m = s.match(/^rgba?\(\s*([\d.]+)\s*,?\s*([\d.]+)\s*,?\s*([\d.]+)/i);
  if (m) return [+m[1] | 0, +m[2] | 0, +m[3] | 0];

  // Slow path for everything else: let the browser parse it.
  const ctx = colourParser();
  if (ctx) {
    // `fillStyle` setter validates+normalises; invalid input is silently
    // discarded, leaving the previous value in place — so reset first.
    ctx.fillStyle = '#000';
    ctx.fillStyle = s;
    const normalised = ctx.fillStyle as string;
    if (normalised !== s) return parseRgb(normalised);
  }
  return [0, 0, 0];
}

/**
 * Linear-RGB interpolation between two CSS colours.
 * `t` is clamped to [0, 1]. Result is an `rgb()` string.
 *
 * Accepts every colour syntax the host browser understands: hex (`#rgb`,
 * `#rrggbb`, `#rrggbbaa`), `rgb()/rgba()`, named colours (`red`, `salmon`),
 * `hsl()/hsla()`, `oklch()`, `color()`, `color-mix()`, etc. Falls back to
 * black for empty / unrecognised input.
 *
 * Hot path: heatmap / choropleth fills. The fast hex/rgb paths allocate
 * nothing per call.
 */
export function lerpColor(a: string, b: string, t: number): string {
  const tt = t < 0 ? 0 : t > 1 ? 1 : t;
  const [ar, ag, ab] = parseRgb(a);
  const [br, bg, bb] = parseRgb(b);
  const r = (ar + (br - ar) * tt) | 0;
  const g = (ag + (bg - ag) * tt) | 0;
  const bl = (ab + (bb - ab) * tt) | 0;
  return `rgb(${r},${g},${bl})`;
}

/**
 * Escape a string for safe insertion into HTML.
 * Used at every tooltip interpolation site.
 */
export function escapeHtml(value: unknown): string {
  const s = value == null ? '' : String(value);
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Schema-agnostic data resolution.
 *
 * Accepts any array of objects and auto-detects label/value fields,
 * or uses explicit field mapping from the user.
 */
export function resolveData(
  data: Record<string, any>[] | null | undefined,
  config: DataMapping
): ResolvedData {
  // Pre-built format
  if (config.labels && config.datasets) {
    return { labels: config.labels, datasets: config.datasets };
  }

  if (!data || !data.length) {
    return { labels: [], datasets: [] };
  }

  const first = data[0];
  const keys = Object.keys(first);

  // Determine label field
  const labelKey =
    config.labelField ||
    config.x ||
    keys.find(k => typeof first[k] === 'string') ||
    keys[0];

  // Determine value fields
  let valueKeys: string[];
  if (config.y) {
    valueKeys = Array.isArray(config.y) ? config.y : [config.y];
  } else if (config.valueField) {
    valueKeys = [config.valueField];
  } else {
    valueKeys = keys.filter(k => k !== labelKey && typeof first[k] === 'number');
  }

  const labels = data.map(d => String(d[labelKey] ?? ''));
  const datasets: Dataset[] = valueKeys.map((key, i) => ({
    label: config.seriesNames?.[i] || key,
    data: data.map(d => {
      const v = d[key];
      return typeof v === 'number' ? v : parseFloat(v) || 0;
    }),
  }));

  return { labels, datasets };
}
