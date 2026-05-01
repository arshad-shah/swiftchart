import type { DataMapping, ScatterGroups } from '../types';
import { BaseChart } from '../core/base';
import {
  niceScale, hexToRgba, arrayMin, arrayMax, safeRadius,
} from '../utils/helpers';
import { Quadtree } from '../perf/quadtree';

interface FlatPoint { sx: number; sy: number; pt: { x: number; y: number; label?: string; size?: number }; gi: number; gName: string }

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

  setData(data: Record<string, any>[] | null | undefined, mapping?: DataMapping): void {
    this._qt = null;
    this._flatPts = [];
    if (Array.isArray(data) && data.length) {
      const xKey = mapping?.x || 'x';
      const yKey = mapping?.y as string || 'y';
      const labelKey = mapping?.labelField || 'label';
      const sizeKey = mapping?.sizeField || 'size';
      const groupKey = mapping?.groupField || 'group';

      const groups: ScatterGroups = {};
      data.forEach((d) => {
        const g = String(d[groupKey] || 'default');
        if (!groups[g]) groups[g] = [];
        groups[g].push({
          x: +d[xKey], y: +d[yKey],
          label: d[labelKey] || '', size: d[sizeKey] || 5,
        });
      });
      this.scatterData = groups;
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

  private _buildQuadtree(): void {
    if (!this.scatterData) return;
    const p = this.plotArea;
    const xs: number[] = [];
    const ys: number[] = [];
    Object.values(this.scatterData).forEach((pts) => {
      pts.forEach((pt) => { xs.push(pt.x); ys.push(pt.y); });
    });
    if (!xs.length) return;
    const xScale = niceScale(arrayMin(xs), arrayMax(xs));
    const yScale = niceScale(arrayMin(ys), arrayMax(ys));
    const xRange = xScale.max - xScale.min || 1;
    const yRange = yScale.max - yScale.min || 1;

    this._qt = new Quadtree({ x: p.x, y: p.y, w: p.w, h: p.h });
    this._flatPts = [];
    let globalIdx = 0;
    Object.entries(this.scatterData).forEach(([gName, pts], gi) => {
      pts.forEach((pt) => {
        const sx = p.x + ((pt.x - xScale.min) / xRange) * p.w;
        const sy = p.y + p.h - ((pt.y - yScale.min) / yRange) * p.h;
        this._qt!.insert({ sx, sy, index: globalIdx, group: gi });
        this._flatPts.push({ sx, sy, pt, gi, gName });
        globalIdx++;
      });
    });
  }

  _onMouse(e: MouseEvent): void {
    if (!this.scatterData) return;
    const rect = this.canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    if (!this._qt) this._buildQuadtree();
    if (this._qt) {
      const nearest = this._qt.nearest(mx, my, 20);
      this.hoverIndex = nearest ? nearest.index : -1;
    } else this.hoverIndex = -1;

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

  _draw(): void {
    if (!this.scatterData) return;
    this._drawBg();
    this._drawTitle();

    const xs: number[] = [];
    const ys: number[] = [];
    Object.values(this.scatterData).forEach((pts) => {
      pts.forEach((pt) => { xs.push(pt.x); ys.push(pt.y); });
    });
    if (!xs.length) return;

    const xScale = niceScale(arrayMin(xs), arrayMax(xs));
    const yScale = niceScale(arrayMin(ys), arrayMax(ys));
    const p = this.plotArea;
    const t = this.animProgress;
    const xRange = xScale.max - xScale.min || 1;
    const yRange = yScale.max - yScale.min || 1;

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

    // Invalidate quadtree on draw — scales may have shifted.
    this._qt = null;

    let globalIdx = 0;
    Object.entries(this.scatterData).forEach(([, pts], gi) => {
      pts.forEach((pt) => {
        const color = this._ptColor(pt.y, globalIdx, gi);
        const sx = p.x + ((pt.x - xScale.min) / xRange) * p.w;
        const sy = p.y + p.h - ((pt.y - yScale.min) / yRange) * p.h;
        const isHover = globalIdx === this.hoverIndex;
        const size = safeRadius((pt.size || 5) * t);
        this.ctx.beginPath();
        this.ctx.arc(sx, sy, safeRadius(isHover ? size + 2 : size), 0, Math.PI * 2);
        this.ctx.fillStyle = isHover ? color : hexToRgba(color, 0.7);
        if (isHover) { this.ctx.shadowColor = hexToRgba(color, 0.5); this.ctx.shadowBlur = 12; }
        this.ctx.fill();
        this.ctx.shadowBlur = 0;
        globalIdx++;
      });
    });
  }
}
