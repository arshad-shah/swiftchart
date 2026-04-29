import type { HeatmapChartConfig, DataMapping } from '../types';
import { BaseChart } from '../core/base';
import { lerpColor, hexToRgba } from '../utils/helpers';

interface HeatCell { x: string; y: string; value: number }

const LEGEND_W = 14;
const LEGEND_GAP = 14;
const LEGEND_TICKS_PAD = 6;

/**
 * Two-axis heatmap. Each cell's colour is a linear ramp between the two
 * `colorScale` stops; the default ramp blends `theme.surface` into the
 * primary accent.
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
      padding: { top: 30, right: 64, bottom: 38, left: 60 },
      showLegend: false,
      ...config,
    });
  }

  private _scale(): [string, string] {
    return this.config.colorScale ?? [this.theme.surface, this.theme.colors[0]];
  }

  setData(data: Record<string, any>[] | null | undefined, mapping?: DataMapping): void {
    const xKey = mapping?.x ?? 'x';
    const yKey = (typeof mapping?.y === 'string' ? mapping.y : undefined) ?? 'y';
    const vKey = mapping?.valueField
      ?? (Array.isArray(mapping?.y) ? mapping!.y[0] : undefined)
      ?? 'value';

    const xs: string[] = [];
    const ys: string[] = [];
    const xIdx = new Map<string, number>();
    const yIdx = new Map<string, number>();
    this._cells = (data || []).map((d) => {
      const x = String(d[xKey]);
      const y = String(d[yKey]);
      if (!xIdx.has(x)) { xIdx.set(x, xs.length); xs.push(x); }
      if (!yIdx.has(y)) { yIdx.set(y, ys.length); ys.push(y); }
      return { x, y, value: +d[vKey] || 0 };
    });
    this._xLabels = xs;
    this._yLabels = ys;

    // Dense grid keyed by [yIndex][xIndex] for O(1) draw + hover lookup.
    this._grid = ys.map(() => new Array(xs.length));
    let lo = Infinity;
    let hi = -Infinity;
    for (const c of this._cells) {
      const xi = xIdx.get(c.x)!;
      const yi = yIdx.get(c.y)!;
      this._grid[yi][xi] = c.value;
      if (c.value < lo) lo = c.value;
      if (c.value > hi) hi = c.value;
    }
    this._min = lo === Infinity ? 0 : lo;
    this._max = hi === -Infinity ? 1 : hi;

    this.resolved = { labels: this._xLabels, datasets: [] };
    this._animate();
  }

  /**
   * Plot rectangle minus the right-side colour-scale legend, so cells fill the
   * remaining area precisely (no leftover whitespace on the right).
   */
  private _heatArea() {
    const p = this.plotArea;
    return { x: p.x, y: p.y, w: Math.max(0, p.w - LEGEND_W - LEGEND_GAP), h: p.h };
  }

  _onMouse(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const a = this._heatArea();
    const xn = this._xLabels.length;
    const yn = this._yLabels.length;
    if (!xn || !yn) return;
    const cw = a.w / xn;
    const ch = a.h / yn;
    const xi = Math.floor((mx - a.x) / cw);
    const yi = Math.floor((my - a.y) / ch);
    if (xi < 0 || xi >= xn || yi < 0 || yi >= yn) {
      this.hoverIndex = -1;
      this.tooltip?.hide();
      this._draw();
      return;
    }
    this.hoverIndex = yi * xn + xi;
    const v = this._grid[yi]?.[xi];
    if (v != null && this.tooltip) {
      this.tooltip.showStructured(a.x + (xi + 0.5) * cw, a.y + (yi + 0.5) * ch, {
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

    const a = this._heatArea();
    const cw = a.w / xn;
    const ch = a.h / yn;
    const range = this._max - this._min || 1;
    const [c0, c1] = this._scale();
    const t = this.animProgress;
    const showVals = this.config.showValues ?? false;
    const ff = this._fontFamily();

    // Cells. Pixel-snap edges so adjacent cells abut without subpixel seams.
    for (let yi = 0; yi < yn; yi++) {
      const row = this._grid[yi];
      const y0 = Math.round(a.y + yi * ch);
      const y1 = Math.round(a.y + (yi + 1) * ch);
      for (let xi = 0; xi < xn; xi++) {
        const v = row[xi];
        if (v == null) continue;
        const norm = (v - this._min) / range;
        const x0 = Math.round(a.x + xi * cw);
        const x1 = Math.round(a.x + (xi + 1) * cw);
        const isHover = this.hoverIndex === yi * xn + xi;
        this.ctx.fillStyle = lerpColor(c0, c1, norm * t);
        this.ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
        if (isHover) {
          this.ctx.strokeStyle = this.theme.text;
          this.ctx.lineWidth = 1.5;
          this.ctx.strokeRect(x0 + 0.5, y0 + 0.5, x1 - x0 - 1, y1 - y0 - 1);
        }
        if (showVals && cw > 28 && ch > 18) {
          this.ctx.fillStyle = norm > 0.55 ? this.theme.onAccent : this.theme.text;
          this.ctx.font = `500 10px ${ff}`;
          this.ctx.textAlign = 'center';
          this.ctx.textBaseline = 'middle';
          this.ctx.fillText(this._fmtVal(v), x0 + (x1 - x0) / 2, y0 + (y1 - y0) / 2);
        }
      }
    }

    // Y axis labels.
    this.ctx.save();
    this.ctx.font = `400 11px ${ff}`;
    this.ctx.fillStyle = this.theme.textMuted;
    this.ctx.textAlign = 'right';
    this.ctx.textBaseline = 'middle';
    for (let yi = 0; yi < yn; yi++) {
      this.ctx.fillText(this._truncate(this._yLabels[yi], 14), a.x - 8, a.y + (yi + 0.5) * ch);
    }
    this.ctx.restore();

    // X axis labels — stride so we never overdraw on dense grids (e.g. 24h).
    this.ctx.save();
    this.ctx.font = `400 11px ${ff}`;
    this.ctx.fillStyle = this.theme.textMuted;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'top';
    let maxLabelW = 0;
    for (const l of this._xLabels) {
      const w = this.ctx.measureText(l).width;
      if (w > maxLabelW) maxLabelW = w;
    }
    const stride = Math.max(1, Math.ceil((maxLabelW + 8) / cw));
    for (let xi = 0; xi < xn; xi += stride) {
      this.ctx.fillText(this._xLabels[xi], a.x + (xi + 0.5) * cw, a.y + a.h + 6);
    }
    this.ctx.restore();

    this._drawLegendBar(a, c0, c1);
  }

  /** Vertical colour ramp + min/max labels on the right side of the plot. */
  private _drawLegendBar(area: { x: number; y: number; w: number; h: number },
                        c0: string, c1: string): void {
    const ff = this._fontFamily();
    const lx = area.x + area.w + LEGEND_GAP;
    const ly = area.y;
    const lh = area.h;

    // Linear gradient (low at bottom, high at top).
    const grad = this.ctx.createLinearGradient(0, ly + lh, 0, ly);
    grad.addColorStop(0, lerpColor(c0, c1, 0));
    grad.addColorStop(1, lerpColor(c0, c1, 1));
    this.ctx.fillStyle = grad;
    this.ctx.fillRect(lx, ly, LEGEND_W, lh);
    this.ctx.strokeStyle = hexToRgba(this.theme.text, 0.18);
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(lx + 0.5, ly + 0.5, LEGEND_W - 1, lh - 1);

    // Min/max numeric labels.
    this.ctx.fillStyle = this.theme.textMuted;
    this.ctx.font = `400 10px ${ff}`;
    this.ctx.textAlign = 'left';
    this.ctx.textBaseline = 'top';
    this.ctx.fillText(this._fmtVal(this._max), lx + LEGEND_W + LEGEND_TICKS_PAD, ly);
    this.ctx.textBaseline = 'bottom';
    this.ctx.fillText(this._fmtVal(this._min), lx + LEGEND_W + LEGEND_TICKS_PAD, ly + lh);
  }
}
