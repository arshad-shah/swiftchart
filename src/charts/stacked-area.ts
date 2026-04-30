import { BaseChart } from '../core/base';
import { niceScale, hexToRgba, clamp, arrayMax } from '../utils/helpers';

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
          value: this._fmtVal(ds.data[this.hoverIndex]),
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
    const stacked = datasets.map((ds) => [...ds.data]);
    for (let si = 1; si < stacked.length; si++) {
      for (let i = 0; i < n; i++) stacked[si][i] += stacked[si - 1][i];
    }
    const top = stacked[stacked.length - 1] || [];
    const maxVal = arrayMax(top);
    const scale = niceScale(0, Math.max(maxVal, 1));
    const p = this.plotArea;
    const stepW = p.w / Math.max(1, n - 1);
    const t = this.animProgress;
    const range = scale.max - scale.min || 1;
    this._drawGrid(scale);
    this._drawXLabels(labels, /*centered=*/ false);
    if (this.hoverIndex >= 0) this._drawCrosshair(this.hoverIndex);

    for (let si = stacked.length - 1; si >= 0; si--) {
      const color = datasets[si].color || this.theme.colors[si % this.theme.colors.length];
      const topPts = stacked[si].map((v, i) => ({
        x: p.x + i * stepW,
        y: p.y + p.h - ((v - scale.min) / range) * p.h * t,
      }));
      const bottomPts = si > 0
        ? stacked[si - 1].map((v, i) => ({
            x: p.x + i * stepW,
            y: p.y + p.h - ((v - scale.min) / range) * p.h * t,
          }))
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
