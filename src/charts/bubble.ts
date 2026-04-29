import type { BubbleChartConfig, DataMapping } from '../types';
import { BaseChart } from '../core/base';
import { niceScale, hexToRgba, safeRadius } from '../utils/helpers';
import { Quadtree } from '../perf/quadtree';

interface BubblePoint {
  x: number;
  y: number;
  size: number;
  group: string;
  label?: string;
}

/**
 * Bubble chart — scatter where each point also encodes a magnitude in its
 * radius. Backed by a quadtree for O(log n) hover.
 *
 * @example
 * ```ts
 * new BubbleChart('#chart').setData(rows, {
 *   x: 'gdp', y: 'lifeExpectancy', sizeField: 'population', groupField: 'continent',
 * });
 * ```
 */
export class BubbleChart extends BaseChart {
  declare config: BubbleChartConfig & BaseChart['config'];

  private _points: BubblePoint[] = [];
  private _qt: Quadtree | null = null;
  private _flat: { sx: number; sy: number; r: number; gi: number; idx: number }[] = [];

  private get _sizeScale(): number { return this.config.sizeScale ?? 1; }
  private get _maxRadius(): number { return this.config.maxRadius ?? 40; }

  setData(data: Record<string, any>[] | null | undefined, mapping?: DataMapping): void {
    const xKey = mapping?.x ?? 'x';
    const yKey = (mapping?.y as string) ?? 'y';
    const sizeKey = mapping?.sizeField ?? 'size';
    const groupKey = mapping?.groupField ?? 'group';
    const labelKey = mapping?.labelField ?? 'label';

    this._points = (data || []).map((d) => ({
      x: +d[xKey],
      y: +d[yKey],
      size: +d[sizeKey] || 1,
      group: String(d[groupKey] ?? 'default'),
      label: d[labelKey] != null ? String(d[labelKey]) : undefined,
    })).filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y));

    // Build resolved.datasets purely so _drawLegend has something to render.
    const seen = new Map<string, number>();
    this._points.forEach((p) => { if (!seen.has(p.group)) seen.set(p.group, seen.size); });
    this.resolved = {
      labels: [],
      datasets: Array.from(seen.keys()).map((g, i) => ({
        label: g,
        data: [],
        color: this.theme.colors[i % this.theme.colors.length],
      })),
    };
    this._qt = null;
    this._animate();
  }

  _onMouse(e: MouseEvent): void {
    if (!this._points.length) return;
    const rect = this.canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    if (!this._qt) return;
    // Query with the largest possible bubble radius so we never miss a
    // hover on a big bubble whose centre is > 24 px from the cursor.
    // Then verify the cursor is actually inside the *rendered* radius of
    // the candidate — quadtree returned the centre-nearest point, but
    // that doesn't guarantee the cursor lies inside its painted disc.
    const queryR = Math.max(24, this._maxRadius + 4);
    const hit = this._qt.nearest(mx, my, queryR);
    if (hit) {
      const f = this._flat[hit.index];
      const dx = mx - f.sx;
      const dy = my - f.sy;
      this.hoverIndex = (dx * dx + dy * dy) <= f.r * f.r ? hit.index : -1;
    } else {
      this.hoverIndex = -1;
    }
    if (this.hoverIndex >= 0 && this.tooltip) {
      const f = this._flat[this.hoverIndex];
      const p = this._points[f.idx];
      const color = this.theme.colors[f.gi % this.theme.colors.length];
      this.tooltip.showStructured(f.sx, f.sy, {
        title: p.label || p.group,
        rows: [
          { label: 'x', value: this._fmtVal(p.x), color },
          { label: 'y', value: this._fmtVal(p.y) },
          { label: 'size', value: this._fmtVal(p.size) },
        ],
      });
    } else this.tooltip?.hide();
    this._draw();
  }

  _draw(): void {
    if (!this._points.length) return;
    this._drawBg();
    this._drawTitle();
    this._drawLegend();

    let xmin = Infinity, xmax = -Infinity, ymin = Infinity, ymax = -Infinity;
    let smin = Infinity, smax = -Infinity;
    for (let i = 0; i < this._points.length; i++) {
      const pt = this._points[i];
      if (pt.x < xmin) xmin = pt.x; if (pt.x > xmax) xmax = pt.x;
      if (pt.y < ymin) ymin = pt.y; if (pt.y > ymax) ymax = pt.y;
      if (pt.size < smin) smin = pt.size; if (pt.size > smax) smax = pt.size;
    }
    const xs = niceScale(xmin, xmax);
    const ys = niceScale(ymin, ymax);
    const p = this.plotArea;
    const t = this.animProgress;
    const xRange = xs.max - xs.min || 1;
    const yRange = ys.max - ys.min || 1;
    const sRange = smax - smin || 1;

    this._drawGrid(ys);
    // X axis ticks (mirroring scatter behaviour).
    const ff = this._fontFamily();
    const xTicks = Math.max(2, Math.round(xRange / xs.step) + 1);
    this.ctx.save();
    this.ctx.font = `400 10px ${ff}`;
    this.ctx.fillStyle = this.theme.textMuted;
    this.ctx.textAlign = 'center';
    for (let i = 0; i < xTicks; i++) {
      const v = xs.min + i * xs.step;
      const x = p.x + ((v - xs.min) / xRange) * p.w;
      this.ctx.strokeStyle = this.theme.grid;
      this.ctx.beginPath();
      this.ctx.moveTo(x, p.y);
      this.ctx.lineTo(x, p.y + p.h);
      this.ctx.stroke();
      this.ctx.fillText(this._fmtVal(v), x, p.y + p.h + 14);
    }
    this.ctx.restore();

    // Index groups for stable colour assignment.
    const groupIdx = new Map<string, number>();
    for (const pt of this._points) {
      if (!groupIdx.has(pt.group)) groupIdx.set(pt.group, groupIdx.size);
    }

    this._qt = new Quadtree({ x: p.x, y: p.y, w: p.w, h: p.h });
    this._flat = [];

    for (let i = 0; i < this._points.length; i++) {
      const pt = this._points[i];
      const sx = p.x + ((pt.x - xs.min) / xRange) * p.w;
      const sy = p.y + p.h - ((pt.y - ys.min) / yRange) * p.h;
      const norm = (pt.size - smin) / sRange;
      const r = safeRadius((4 + norm * 28) * this._sizeScale, this._maxRadius) * t;
      const gi = groupIdx.get(pt.group) || 0;
      const color = this.theme.colors[gi % this.theme.colors.length];
      const isHover = this._flat.length === this.hoverIndex;

      this.ctx.beginPath();
      this.ctx.arc(sx, sy, r, 0, Math.PI * 2);
      this.ctx.fillStyle = hexToRgba(color, isHover ? 0.85 : 0.55);
      this.ctx.fill();
      this.ctx.strokeStyle = color;
      this.ctx.lineWidth = isHover ? 2 : 1;
      this.ctx.stroke();

      this._qt.insert({ sx, sy, index: this._flat.length, group: gi });
      this._flat.push({ sx, sy, r, gi, idx: i });
    }
  }
}
