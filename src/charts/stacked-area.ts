import { BaseChart } from '../core/base';
import { niceScale, hexToRgba, clamp, arrayMax } from '../utils/helpers';
import { lttbIndices, autoTarget } from '../perf/lttb';

/**
 * Canvas 2D stacked-area chart — shows total + per-component contribution.
 *
 * @example
 * ```ts
 * import { StackedAreaChart } from '@arshad-shah/swift-chart';
 *
 * const chart = new StackedAreaChart('#chart', { theme: 'midnight' });
 * chart.setData(traffic, { x: 'day', y: ['api', 'web', 'mobile'] });
 * ```
 */
export class StackedAreaChart extends BaseChart {
  /**
   * Cached cumulative stack + shared downsample indices. Stacking is
   * O(n × series) and was rebuilt on every animation frame / hover redraw;
   * with 100k points that alone caused visible jank. Indices are chosen by
   * LTTB on the stack *top* (the visually dominant edge) and shared across
   * all layers so layer boundaries stay vertically aligned.
   */
  private _prep: {
    datasets: readonly unknown[];
    pW: number;
    stacked: number[][];
    indices: number[] | null;
    maxVal: number;
  } | null = null;

  private _prepare(pW: number): NonNullable<StackedAreaChart['_prep']> {
    const { labels, datasets } = this.resolved;
    const c = this._prep;
    if (c && c.datasets === datasets && c.pW === pW) return c;
    const n = labels.length;
    // Coerce holes to 0 while stacking: an `undefined`/NaN in a ragged
    // pre-built dataset would otherwise poison every layer above it (NaN
    // propagates additively) and silently blank the chart.
    const norm = (v: number) => (Number.isFinite(v) ? v : 0);
    const stacked = datasets.map((ds) => Array.from({ length: n }, (_, i) => norm(ds.data[i])));
    for (let si = 1; si < stacked.length; si++) {
      for (let i = 0; i < n; i++) stacked[si][i] += stacked[si - 1][i];
    }
    const top = stacked[stacked.length - 1] || [];
    const maxVal = arrayMax(top);
    const target = autoTarget(n, pW);
    const indices = n > target ? lttbIndices(top, target) : null;
    this._prep = { datasets, pW, stacked, indices, maxVal };
    return this._prep;
  }

  _onMouse(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const p = this.plotArea;
    const n = this.resolved.labels.length;
    if (!n) return;
    const stepW = p.w / Math.max(1, n - 1);
    const idx = Math.round((mx - p.x) / stepW);
    this.hoverIndex = clamp(idx, 0, n - 1);
    if (this.tooltip) {
      const x = p.x + this.hoverIndex * stepW;
      const total = this.resolved.datasets.reduce((a, ds) => a + (ds.data[this.hoverIndex] ?? 0), 0);
      const rows = this.resolved.datasets.map((ds, i) => {
        const color = ds.color || this.theme.colors[i % this.theme.colors.length];
        return {
          label: ds.label || `Series ${i + 1}`,
          value: this._fmtVal(ds.data[this.hoverIndex] ?? 0),
          color,
        };
      });
      this.tooltip.showStructured(x, p.y + p.h / 3, {
        title: this.resolved.labels[this.hoverIndex],
        rows,
        footer: `Total: ${this._fmtVal(total)}`,
      });
    }
    this._draw();
  }

  _draw(): void {
    const { labels, datasets } = this.resolved;
    if (!labels.length) return;
    this._drawBg();
    this._drawTitle();
    this._drawLegend();
    const n = labels.length;
    const p = this.plotArea;
    const { stacked, indices, maxVal } = this._prepare(p.w);
    const scale = niceScale(0, Math.max(maxVal, 1));
    const stepW = p.w / Math.max(1, n - 1);
    const t = this.animProgress;
    const range = scale.max - scale.min || 1;
    this._drawGrid(scale);
    this._drawXLabels(labels, /*centered=*/ false);
    if (this.hoverIndex >= 0) this._drawCrosshair(this.hoverIndex);

    const count = indices ? indices.length : n;
    const toPts = (layer: number[]): { x: number; y: number }[] => {
      const pts: { x: number; y: number }[] = new Array(count);
      for (let k = 0; k < count; k++) {
        const i = indices ? indices[k] : k;
        pts[k] = {
          x: p.x + i * stepW,
          y: p.y + p.h - ((layer[i] - scale.min) / range) * p.h * t,
        };
      }
      return pts;
    };

    for (let si = stacked.length - 1; si >= 0; si--) {
      const color = datasets[si].color || this.theme.colors[si % this.theme.colors.length];
      const topPts = toPts(stacked[si]);
      const bottomPts = si > 0
        ? toPts(stacked[si - 1])
        : topPts.map((pt) => ({ x: pt.x, y: p.y + p.h }));

      this.ctx.beginPath();
      topPts.forEach((pt, i) => (i === 0 ? this.ctx.moveTo(pt.x, pt.y) : this.ctx.lineTo(pt.x, pt.y)));
      for (let i = bottomPts.length - 1; i >= 0; i--) this.ctx.lineTo(bottomPts[i].x, bottomPts[i].y);
      this.ctx.closePath();
      this.ctx.fillStyle = hexToRgba(color, 0.6);
      this.ctx.fill();
      this.ctx.strokeStyle = color;
      this.ctx.lineWidth = 1.5;
      this.ctx.beginPath();
      topPts.forEach((pt, i) => (i === 0 ? this.ctx.moveTo(pt.x, pt.y) : this.ctx.lineTo(pt.x, pt.y)));
      this.ctx.stroke();
    }
  }
}
