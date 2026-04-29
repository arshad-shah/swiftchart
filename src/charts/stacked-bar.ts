import type { StackedBarChartConfig } from '../types';
import { BaseChart } from '../core/base';
import { niceScale, hexToRgba, arrayMax, safeRadius } from '../utils/helpers';

/**
 * Vertical stacked bar chart. Each label slot stacks the series values.
 *
 * Pass `percent: true` to normalise each stack to 100 % (proportional view).
 *
 * @example
 * ```ts
 * import { StackedBarChart } from '@arshad-shah/swift-chart';
 *
 * const chart = new StackedBarChart('#chart', { theme: 'midnight' });
 * chart.setData(traffic, { x: 'day', y: ['api', 'web', 'mobile'] });
 * ```
 */
export class StackedBarChart extends BaseChart {
  declare config: StackedBarChartConfig & BaseChart['config'];

  private get _percent(): boolean { return !!this.config.percent; }

  _onMouse(e: MouseEvent): void {
    const n = this.resolved.labels.length;
    this.hoverIndex = this._idxFromX(e, n);
    if (this.hoverIndex >= 0 && this.tooltip) {
      const p = this.plotArea;
      const slot = p.w / n;
      const total = this.resolved.datasets.reduce((s, d) => s + (d.data[this.hoverIndex] ?? 0), 0);
      const rows = this.resolved.datasets.map((d, i) => ({
        label: d.label || `Series ${i + 1}`,
        value: this._fmtVal(d.data[this.hoverIndex] ?? 0),
        color: d.color || this.theme.colors[i % this.theme.colors.length],
      }));
      this.tooltip.showStructured(p.x + (this.hoverIndex + 0.5) * slot, p.y + p.h / 2, {
        title: this.resolved.labels[this.hoverIndex],
        rows,
        footer: `Total: ${this._fmtVal(total)}`,
      });
    }
    this._draw();
  }

  _draw(): void {
    const { labels, datasets } = this.resolved;
    if (!labels.length || !datasets.length) return;

    this._drawBg();
    this._drawTitle();

    const n = labels.length;
    // Per-slot totals (denominator for percent mode and for axis scaling).
    const totals = new Array<number>(n);
    for (let i = 0; i < n; i++) {
      let s = 0;
      for (let si = 0; si < datasets.length; si++) {
        const v = datasets[si].data[i];
        if (v > 0) s += v;
      }
      totals[i] = s;
    }
    const maxTotal = arrayMax(totals);
    const scale = this._percent
      ? { min: 0, max: 100, step: 25 }
      : niceScale(0, Math.max(maxTotal, 1));
    const p = this.plotArea;
    this._drawGrid(scale);
    this._drawXLabels(labels, /*centered=*/ true);
    this._drawLegend();

    const slot = p.w / n;
    const groupPad = slot * 0.18;
    const barW = Math.max(1, slot - groupPad * 2);
    const t = this.animProgress;
    const range = scale.max - scale.min || 1;

    // Single pass per slot: accumulate y position and draw segments bottom→top.
    for (let i = 0; i < n; i++) {
      const xStart = p.x + i * slot + groupPad;
      const denom = this._percent ? totals[i] || 1 : 1;
      let yCursor = p.y + p.h;
      const isHover = i === this.hoverIndex;
      for (let si = 0; si < datasets.length; si++) {
        const v = datasets[si].data[i] ?? 0;
        if (v <= 0) continue;
        const seg = this._percent ? (v / denom) * 100 : v;
        const h = (seg / range) * p.h * t;
        if (h <= 0) continue;
        const color = datasets[si].color || this.theme.colors[si % this.theme.colors.length];
        this.ctx.fillStyle = isHover ? color : hexToRgba(color, 0.85);
        this.ctx.fillRect(xStart, yCursor - h, barW, h);
        yCursor -= h;
      }
      // Subtle rounded cap on the topmost segment.
      const r = safeRadius(Math.min(3, barW / 2));
      if (r > 0 && yCursor < p.y + p.h) {
        this.ctx.fillStyle = this.theme.bg;
        this.ctx.beginPath();
        this.ctx.moveTo(xStart, yCursor);
        this.ctx.lineTo(xStart, yCursor - r);
        this.ctx.lineTo(xStart + r, yCursor - r);
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.beginPath();
        this.ctx.moveTo(xStart + barW, yCursor);
        this.ctx.lineTo(xStart + barW, yCursor - r);
        this.ctx.lineTo(xStart + barW - r, yCursor - r);
        this.ctx.closePath();
        this.ctx.fill();
      }
    }
  }
}
