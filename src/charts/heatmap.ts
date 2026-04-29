import type { HeatmapChartConfig, DataMapping } from '../types';
import { BaseChart } from '../core/base';
import { lerpColor, hexToRgba } from '../utils/helpers';

interface HeatCell {
  x: string;
  y: string;
  value: number;
}

/**
 * Two-axis heatmap. Cells are coloured along a linear ramp between the two
 * `colorScale` stops. Hover hits an O(1) cell lookup keyed by canvas grid.
 *
 * Mapping convention: `x`, `y` are the categorical fields; `valueField` (or
 * the second `y` entry) is the magnitude.
 *
 * @example
 * ```ts
 * new HeatmapChart('#chart').setData(grid, { x: 'hour', y: 'day', valueField: 'visits' });
 * ```
 */
export class HeatmapChart extends BaseChart {
  declare config: HeatmapChartConfig & BaseChart['config'];

  private _cells: HeatCell[] = [];
  private _xLabels: string[] = [];
  private _yLabels: string[] = [];
  private _grid: (number | undefined)[][] = [];
  private _min = 0;
  private _max = 1;

  constructor(container: HTMLElement | string, config: HeatmapChartConfig = {}) {
    super(container, {
      padding: { top: 30, right: 20, bottom: 50, left: 80 },
      showLegend: false,
      ...config,
    });
  }

  private _scale(): [string, string] {
    return this.config.colorScale ?? [hexToRgba(this.theme.bg, 1), this.theme.colors[0]];
  }

  setData(data: Record<string, any>[] | null | undefined, mapping?: DataMapping): void {
    const xKey = mapping?.x ?? 'x';
    const yKey = (typeof mapping?.y === 'string' ? mapping.y : undefined) ?? 'y';
    const vKey = mapping?.valueField
      ?? (Array.isArray(mapping?.y) ? mapping!.y[0] : undefined)
      ?? 'value';

    const xs: string[] = [];
    const ys: string[] = [];
    const xSet = new Set<string>();
    const ySet = new Set<string>();
    this._cells = (data || []).map((d) => {
      const x = String(d[xKey]);
      const y = String(d[yKey]);
      if (!xSet.has(x)) { xSet.add(x); xs.push(x); }
      if (!ySet.has(y)) { ySet.add(y); ys.push(y); }
      return { x, y, value: +d[vKey] || 0 };
    });
    this._xLabels = xs;
    this._yLabels = ys;

    // Sparse grid keyed by [yIndex][xIndex] for O(1) hover lookup.
    this._grid = ys.map(() => new Array(xs.length));
    let lo = Infinity;
    let hi = -Infinity;
    for (const c of this._cells) {
      const xi = xs.indexOf(c.x);
      const yi = ys.indexOf(c.y);
      this._grid[yi][xi] = c.value;
      if (c.value < lo) lo = c.value;
      if (c.value > hi) hi = c.value;
    }
    this._min = lo === Infinity ? 0 : lo;
    this._max = hi === -Infinity ? 1 : hi;

    // Mirror into resolved so legend / title plumbing still works.
    this.resolved = { labels: this._xLabels, datasets: [] };
    this._animate();
  }

  _onMouse(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const p = this.plotArea;
    const xn = this._xLabels.length;
    const yn = this._yLabels.length;
    if (!xn || !yn) return;
    const cw = p.w / xn;
    const ch = p.h / yn;
    const xi = Math.floor((mx - p.x) / cw);
    const yi = Math.floor((my - p.y) / ch);
    if (xi < 0 || xi >= xn || yi < 0 || yi >= yn) {
      this.hoverIndex = -1;
      this.tooltip?.hide();
      this._draw();
      return;
    }
    this.hoverIndex = yi * xn + xi;
    const v = this._grid[yi]?.[xi];
    if (v != null && this.tooltip) {
      this.tooltip.showStructured(p.x + (xi + 0.5) * cw, p.y + (yi + 0.5) * ch, {
        title: `${this._yLabels[yi]} · ${this._xLabels[xi]}`,
        rows: [{ label: 'value', value: this._fmtVal(v), color: this.theme.colors[0] }],
      });
    }
    this._draw();
  }

  _draw(): void {
    const xn = this._xLabels.length;
    const yn = this._yLabels.length;
    if (!xn || !yn) return;
    this._drawBg();
    this._drawTitle();

    const p = this.plotArea;
    const cw = p.w / xn;
    const ch = p.h / yn;
    const range = this._max - this._min || 1;
    const [c0, c1] = this._scale();
    const t = this.animProgress;
    const showVals = this.config.showValues ?? false;
    const ff = this._fontFamily();

    for (let yi = 0; yi < yn; yi++) {
      const row = this._grid[yi];
      for (let xi = 0; xi < xn; xi++) {
        const v = row[xi];
        if (v == null) continue;
        const norm = (v - this._min) / range;
        this.ctx.fillStyle = lerpColor(c0, c1, norm * t);
        const isHover = this.hoverIndex === yi * xn + xi;
        const pad = isHover ? 0 : 1;
        this.ctx.fillRect(p.x + xi * cw + pad, p.y + yi * ch + pad, cw - pad * 2, ch - pad * 2);
        if (showVals && cw > 28 && ch > 18) {
          this.ctx.fillStyle = norm > 0.55 ? this.theme.onAccent : this.theme.text;
          this.ctx.font = `500 10px ${ff}`;
          this.ctx.textAlign = 'center';
          this.ctx.textBaseline = 'middle';
          this.ctx.fillText(this._fmtVal(v), p.x + xi * cw + cw / 2, p.y + yi * ch + ch / 2);
        }
      }
    }

    // Y axis labels (rows).
    this.ctx.save();
    this.ctx.font = `400 11px ${ff}`;
    this.ctx.fillStyle = this.theme.textMuted;
    this.ctx.textAlign = 'right';
    this.ctx.textBaseline = 'middle';
    for (let yi = 0; yi < yn; yi++) {
      this.ctx.fillText(this._truncate(this._yLabels[yi], 12), p.x - 8, p.y + (yi + 0.5) * ch);
    }
    this.ctx.restore();

    // X axis labels (columns).
    this.ctx.save();
    this.ctx.font = `400 11px ${ff}`;
    this.ctx.fillStyle = this.theme.textMuted;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'top';
    for (let xi = 0; xi < xn; xi++) {
      this.ctx.fillText(this._truncate(this._xLabels[xi], 8), p.x + (xi + 0.5) * cw, p.y + p.h + 6);
    }
    this.ctx.restore();
  }
}
