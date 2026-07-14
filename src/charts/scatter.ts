import type { ChartClickEvent, DataMapping, NiceScale, ScatterGroups, Theme } from '../types';
import { BaseChart } from '../core/base';
import {
  niceScale, hexToRgba, arrayMin, arrayMax, safeRadius, dpr,
} from '../utils/helpers';
import { Quadtree } from '../perf/quadtree';

/** Sprite raster radius (px) and anti-aliasing pad around it. */
const SPRITE_R = 16;
const SPRITE_PAD = 2;
/** Cap on distinct cached point sprites (relevant only with a `colorFn`). */
const SPRITE_CACHE_MAX = 256;

interface FlatPoint {
  sx: number;
  sy: number;
  pt: { x: number; y: number; label?: string; size?: number };
  gi: number;
  gName: string;
  /** Index into the original `setData(rows)` array — surfaced in click events. */
  origIdx: number;
}

/**
 * Canvas 2D scatter chart with grouping and optional per-point sizing.
 * Hover lookup is backed by a quadtree (`O(log n)`) so it stays responsive
 * for tens of thousands of points.
 *
 * @example
 * ```ts
 * import { ScatterChart } from '@arshad-shah/swift-chart';
 *
 * const chart = new ScatterChart('#chart', { theme: 'midnight' });
 * chart.setData(points, { x: 'x', y: 'y', groupField: 'group', sizeField: 'size' });
 * ```
 */
export class ScatterChart extends BaseChart {
  scatterData: ScatterGroups | null = null;
  private _qt: Quadtree | null = null;
  private _flatPts: FlatPoint[] = [];
  private _origIdxOf: WeakMap<object, number> | null = null;
  /** Bumped on every setData so the layout cache key changes with the data. */
  private _dataRev = 0;
  /** Cache key (data revision + plot rect) the current layout was built for. */
  private _layoutKey = '';
  private _xScale: NiceScale = { min: 0, max: 1, step: 1 };
  private _yScale: NiceScale = { min: 0, max: 1, step: 1 };
  /** Pre-rasterised point sprites keyed by colour. */
  private _sprites = new Map<string, HTMLCanvasElement>();
  /**
   * Fully-rendered point cloud for the settled (animProgress = 1) state.
   * Hover redraws blit this bitmap instead of re-stamping every point, so
   * mousemove cost is independent of dataset size.
   */
  private _layer: {
    canvas: HTMLCanvasElement;
    key: string;
    theme: Theme;
    colorFn: unknown;
  } | null = null;

  setData(data: Record<string, any>[] | null | undefined, mapping?: DataMapping): void {
    this._rawData = Array.isArray(data) ? data : undefined;
    this._dataRev++;
    this._layoutKey = '';
    this._qt = null;
    this._flatPts = [];
    if (Array.isArray(data) && data.length) {
      const xKey = mapping?.x || 'x';
      const yKey = mapping?.y as string || 'y';
      const labelKey = mapping?.labelField || 'label';
      const sizeKey = mapping?.sizeField || 'size';
      const groupKey = mapping?.groupField || 'group';

      const groups: ScatterGroups = {};
      // Tracked alongside (not on) the public ScatterPoint shape so the type
      // stays unchanged — let the click event surface the original row.
      const origIdxOf = new WeakMap<object, number>();
      data.forEach((d, origIdx) => {
        const g = String(d[groupKey] || 'default');
        if (!groups[g]) groups[g] = [];
        const pt = {
          x: +d[xKey], y: +d[yKey],
          label: d[labelKey] || '', size: d[sizeKey] || 5,
        };
        origIdxOf.set(pt, origIdx);
        groups[g].push(pt);
      });
      this.scatterData = groups;
      this._origIdxOf = origIdxOf;
      this.resolved = {
        labels: [],
        datasets: Object.keys(groups).map((g, i) => ({
          label: g,
          data: [],
          color: this.theme.colors[i % this.theme.colors.length],
        })),
      };
    } else {
      this.scatterData = null;
      this.resolved = { labels: [], datasets: [] };
    }
    this._animate();
  }

  /** Layered colour resolution: `colorFn` → group palette index. */
  private _ptColor(value: number, dataIdx: number, groupIdx: number): string {
    const fn = this.config.colorFn;
    if (fn) {
      const c = fn(value, dataIdx, groupIdx);
      if (c) return c;
    }
    const palette = this.theme.colors;
    return palette[groupIdx % palette.length];
  }

  /**
   * Build (or reuse) the screen-space layout: scales, flat point list, and
   * hit-testing quadtree. Cached on (data revision, plot rect) — previously
   * the quadtree was invalidated on every draw, so each mousemove paid a
   * full O(n) rebuild before the O(log n) lookup it was meant to enable.
   * Returns true when there is at least one point to draw.
   */
  private _ensureLayout(): boolean {
    if (!this.scatterData) return false;
    const p = this.plotArea;
    const key = `${this._dataRev}|${p.x},${p.y},${p.w},${p.h}`;
    if (this._layoutKey === key && this._qt) return this._flatPts.length > 0;

    const xs: number[] = [];
    const ys: number[] = [];
    Object.values(this.scatterData).forEach((pts) => {
      pts.forEach((pt) => { xs.push(pt.x); ys.push(pt.y); });
    });
    if (!xs.length) {
      this._qt = null;
      this._flatPts = [];
      return false;
    }
    const xScale = niceScale(arrayMin(xs), arrayMax(xs));
    const yScale = niceScale(arrayMin(ys), arrayMax(ys));
    const xRange = xScale.max - xScale.min || 1;
    const yRange = yScale.max - yScale.min || 1;
    this._xScale = xScale;
    this._yScale = yScale;

    this._qt = new Quadtree({ x: p.x, y: p.y, w: p.w, h: p.h });
    this._flatPts = [];
    let globalIdx = 0;
    Object.entries(this.scatterData).forEach(([gName, pts], gi) => {
      pts.forEach((pt) => {
        const sx = p.x + ((pt.x - xScale.min) / xRange) * p.w;
        const sy = p.y + p.h - ((pt.y - yScale.min) / yRange) * p.h;
        this._qt!.insert({ sx, sy, index: globalIdx, group: gi });
        const origIdx = this._origIdxOf?.get(pt) ?? -1;
        this._flatPts.push({ sx, sy, pt, gi, gName, origIdx });
        globalIdx++;
      });
    });
    this._layoutKey = key;
    return true;
  }

  _onMouse(e: MouseEvent): void {
    if (!this.scatterData) return;
    const rect = this.canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    this._ensureLayout();
    if (this._qt) {
      const nearest = this._qt.nearest(mx, my, 20);
      this.hoverIndex = nearest ? nearest.index : -1;
    } else this.hoverIndex = -1;
    this.hoverSeriesIndex =
      this.hoverIndex >= 0 && this._flatPts[this.hoverIndex]
        ? this._flatPts[this.hoverIndex].gi
        : -1;

    if (this.hoverIndex >= 0 && this.tooltip && this._flatPts[this.hoverIndex]) {
      const fp = this._flatPts[this.hoverIndex];
      const color = this._ptColor(fp.pt.y, this.hoverIndex, fp.gi);
      this.tooltip.showStructured(fp.sx, fp.sy, {
        title: fp.pt.label || fp.gName,
        rows: [
          { label: 'x', value: this._fmtVal(fp.pt.x), color },
          { label: 'y', value: this._fmtVal(fp.pt.y) },
        ],
      });
    } else this.tooltip?.hide();
    this._draw();
  }

  protected _buildClickEvent(index: number, nativeEvent: MouseEvent): ChartClickEvent {
    const fp = this._flatPts[index];
    if (!fp) return super._buildClickEvent(index, nativeEvent);
    return {
      index,
      seriesIndex: fp.gi,
      label: fp.pt.label ?? fp.gName ?? '',
      value: fp.pt.y,
      datum: this._rawData && fp.origIdx >= 0 ? this._rawData[fp.origIdx] : undefined,
      series: this.resolved.datasets[fp.gi],
      data: this.resolved,
      nativeEvent,
    };
  }

  /**
   * Fetch (or rasterise) the shared circle sprite for a colour. Stamping a
   * pre-rendered bitmap via `drawImage` is several times cheaper than a
   * per-point `beginPath`/`arc`/`fill` and allocates no per-point strings —
   * the 0.7 base alpha is baked into the sprite, so overlap still darkens
   * exactly like the old per-arc compositing did.
   */
  private _sprite(color: string): HTMLCanvasElement | null {
    const s = this._sprites.get(color);
    if (s) return s;
    if (this._sprites.size >= SPRITE_CACHE_MAX) this._sprites.clear();
    const c = document.createElement('canvas');
    c.width = c.height = (SPRITE_R + SPRITE_PAD) * 2;
    const sctx = c.getContext('2d');
    if (!sctx) return null;
    sctx.beginPath();
    sctx.arc(SPRITE_R + SPRITE_PAD, SPRITE_R + SPRITE_PAD, SPRITE_R, 0, Math.PI * 2);
    sctx.fillStyle = hexToRgba(color, 0.7);
    sctx.fill();
    this._sprites.set(color, c);
    return c;
  }

  /** Stamp every point (base style, no hover treatment) onto `ctx`. */
  private _drawPointsTo(ctx: CanvasRenderingContext2D, t: number): void {
    const colorFn = this.config.colorFn;
    const palette = this.theme.colors;
    // Without a colorFn every point in a group shares one sprite — resolve
    // it per group instead of per point.
    const groupSprites = colorFn
      ? null
      : Array.from(
          { length: this.resolved.datasets.length },
          (_, gi) => this._sprite(palette[gi % palette.length]),
        );
    for (let idx = 0; idx < this._flatPts.length; idx++) {
      const fp = this._flatPts[idx];
      const r = safeRadius((fp.pt.size || 5) * t);
      if (r <= 0) continue;
      const sprite = groupSprites
        ? groupSprites[fp.gi]
        : this._sprite(this._ptColor(fp.pt.y, idx, fp.gi));
      if (sprite) {
        const half = ((SPRITE_R + SPRITE_PAD) / SPRITE_R) * r;
        ctx.drawImage(sprite, fp.sx - half, fp.sy - half, half * 2, half * 2);
      } else {
        // No 2D context for sprite rasterisation — draw the arc directly.
        const color = this._ptColor(fp.pt.y, idx, fp.gi);
        ctx.beginPath();
        ctx.arc(fp.sx, fp.sy, r, 0, Math.PI * 2);
        ctx.fillStyle = hexToRgba(color, 0.7);
        ctx.fill();
      }
    }
  }

  _draw(): void {
    if (!this.scatterData) return;
    this._drawBg();
    this._drawTitle();
    if (!this._ensureLayout()) return;

    const xScale = this._xScale;
    const yScale = this._yScale;
    const p = this.plotArea;
    const t = this.animProgress;
    const xRange = xScale.max - xScale.min || 1;

    this._drawGrid(yScale);
    this._drawLegend();
    const ff = this._fontFamily();
    const tickCount = Math.max(2, Math.round(xRange / xScale.step) + 1);
    for (let i = 0; i < tickCount; i++) {
      const v = xScale.min + i * xScale.step;
      const x = p.x + ((v - xScale.min) / xRange) * p.w;
      this.ctx.strokeStyle = this.theme.grid;
      this.ctx.beginPath();
      this.ctx.moveTo(x, p.y);
      this.ctx.lineTo(x, p.y + p.h);
      this.ctx.stroke();
      this.ctx.fillStyle = this.theme.textMuted;
      this.ctx.font = `400 10px ${ff}`;
      this.ctx.textAlign = 'center';
      this.ctx.fillText(this._fmtVal(v), x, p.y + p.h + 14);
    }

    // ── Point cloud ─────────────────────────────────────
    // In the settled state (t === 1) the cloud is static across hover
    // redraws, so it's rendered once into an offscreen layer and blitted.
    // During the entry animation (t < 1) sizes change per frame — stamp
    // sprites directly.
    if (t === 1) {
      const L = this._layer;
      const valid =
        L &&
        L.key === this._layoutKey &&
        L.theme === this.theme &&
        L.colorFn === this.config.colorFn &&
        L.canvas.width === this.canvas.width &&
        L.canvas.height === this.canvas.height;
      if (!valid) {
        const c = document.createElement('canvas');
        c.width = this.canvas.width;
        c.height = this.canvas.height;
        const lctx = c.getContext('2d');
        if (lctx) {
          const d = dpr();
          lctx.setTransform(d, 0, 0, d, 0, 0);
          this._drawPointsTo(lctx, 1);
          this._layer = {
            canvas: c,
            key: this._layoutKey,
            theme: this.theme,
            colorFn: this.config.colorFn,
          };
        } else {
          this._layer = null;
        }
      }
      if (this._layer) {
        this.ctx.save();
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        this.ctx.drawImage(this._layer.canvas, 0, 0);
        this.ctx.restore();
      } else {
        this._drawPointsTo(this.ctx, 1);
      }
    } else {
      this._drawPointsTo(this.ctx, t);
    }

    // ── Hover highlight (on top of the cloud) ───────────
    const hi = this.hoverIndex;
    const fp = hi >= 0 ? this._flatPts[hi] : undefined;
    if (fp) {
      const color = this._ptColor(fp.pt.y, hi, fp.gi);
      const size = safeRadius((fp.pt.size || 5) * t);
      this.ctx.beginPath();
      this.ctx.arc(fp.sx, fp.sy, safeRadius(size + 2), 0, Math.PI * 2);
      this.ctx.fillStyle = color;
      this.ctx.shadowColor = hexToRgba(color, 0.5);
      this.ctx.shadowBlur = 12;
      this.ctx.fill();
      this.ctx.shadowBlur = 0;
    }
  }
}
