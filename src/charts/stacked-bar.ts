import type { StackedBarChartConfig } from '../types';
import { BaseChart } from '../core/base';
import { niceScale, hexToRgba, arrayMax } from '../utils/helpers';
import { roundedBar, seriesColor } from '../core/draw';

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
        color: seriesColor(this.theme, d, i),
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

    // Two-pass per slot: first compute the top-segment index (so we know which
    // segment owns the rounded top corners), then draw bottom-up. Hover glow
    // wraps the whole stack — matches BarChart's polish.
    for (let i = 0; i < n; i++) {
      const xStart = p.x + i * slot + groupPad;
      const denom = this._percent ? totals[i] || 1 : 1;
      const isHover = i === this.hoverIndex;

      // Find topmost (last-positive) series in this slot.
      let topSeries = -1;
      for (let si = datasets.length - 1; si >= 0; si--) {
        if ((datasets[si].data[i] ?? 0) > 0) { topSeries = si; break; }
      }

      let yCursor = p.y + p.h;
      const cornerR = Math.min(3, barW / 2);

      for (let si = 0; si < datasets.length; si++) {
        const v = datasets[si].data[i] ?? 0;
        if (v <= 0) continue;
        const seg = this._percent ? (v / denom) * 100 : v;
        const h = (seg / range) * p.h * t;
        if (h <= 0) continue;

        const color = seriesColor(this.theme, datasets[si], si);
        const isTop = si === topSeries;
        // Round only the top corners — and only on the topmost segment of
        // the stack — so the rest butt cleanly together.
        const r = isTop ? cornerR : 0;
        roundedBar(this.ctx, xStart, yCursor - h, barW, h,
          isHover ? color : hexToRgba(color, 0.85),
          { radii: [r, r, 0, 0], hover: isHover && isTop, glowColor: color });
        yCursor -= h;
      }
    }
  }
}
