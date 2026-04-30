import type { ComboChartConfig } from '../types';
import { BaseChart } from '../core/base';
import { niceScale, hexToRgba, arraysExtent, safeRadius } from '../utils/helpers';
import { roundedBar, seriesColor, yProj } from '../core/draw';

/**
 * Combo chart — bars + an overlay line series. List the series labels that
 * should render as a line in `lineSeries`; the rest become bars.
 *
 * Both share the same Y axis (single scale across all data) so the line and
 * bars stay comparable. Pass distinct units? Render two combos.
 *
 * @example
 * ```ts
 * new ComboChart('#chart', { lineSeries: ['target'] }).setData(monthlySales, {
 *   x: 'month', y: ['revenue', 'cost', 'target'],
 * });
 * ```
 */
export class ComboChart extends BaseChart {
  declare config: ComboChartConfig & BaseChart['config'];

  private _classify(): { bars: number[]; lines: number[] } {
    const lineLabels = new Set(this.config.lineSeries || []);
    const bars: number[] = [];
    const lines: number[] = [];
    this.resolved.datasets.forEach((d, i) => {
      (lineLabels.has(d.label) ? lines : bars).push(i);
    });
    return { bars, lines };
  }

  _onMouse(e: MouseEvent): void {
    const n = this.resolved.labels.length;
    this.hoverIndex = this._idxFromX(e, n);
    if (this.hoverIndex >= 0 && this.tooltip) {
      const p = this.plotArea;
      const slot = p.w / n;
      this.tooltip.showStructured(p.x + (this.hoverIndex + 0.5) * slot, p.y + p.h / 2,
        this._tooltipContent(this.hoverIndex));
    }
    this._draw();
  }

  _draw(): void {
    const { labels, datasets } = this.resolved;
    if (!labels.length || !datasets.length) return;
    this._drawBg();
    this._drawTitle();

    // eslint-disable-next-line prefer-const
    let [minV, maxV] = arraysExtent(datasets.map((d) => d.data));
    if (minV > 0) minV = 0;
    const scale = niceScale(minV, maxV);
    const p = this.plotArea;
    this._drawGrid(scale);
    this._drawXLabels(labels, /*centered=*/ true);
    this._drawLegend();

    const n = labels.length;
    const slot = p.w / n;
    const t = this.animProgress;
    const yOf = yProj(scale, p);
    const zeroY = yOf(0);
    const { bars, lines } = this._classify();

    // Bars first so the line draws on top.
    const barCount = Math.max(1, bars.length);
    const groupPad = slot * 0.18;
    const barGap = 2;
    const barW = Math.max(1, (slot - groupPad * 2 - barGap * (barCount - 1)) / barCount);
    bars.forEach((si, k) => {
      const ds = datasets[si];
      const color = seriesColor(this.theme, ds, si);
      for (let i = 0; i < n; i++) {
        const v = ds.data[i] ?? 0;
        if (v === 0) continue;
        const xStart = p.x + i * slot + groupPad + k * (barW + barGap);
        const range = scale.max - scale.min || 1;
        const h = (Math.abs(v) / range) * p.h * t;
        const y = v >= 0 ? zeroY - h : zeroY;
        const isHover = i === this.hoverIndex;
        const r = Math.min(3, h / 2);
        const radii: [number, number, number, number] =
          v >= 0 ? [r, r, 0, 0] : [0, 0, r, r];
        roundedBar(this.ctx, xStart, y, barW, h,
          isHover ? color : hexToRgba(color, 0.85),
          { radii, hover: isHover, glowColor: color });
      }
    });

    // Line series.
    const lineW = this.config.lineWidth ?? 2.25;
    const yOfNoT = yProj(scale, p); // line ignores t — values are already final
    lines.forEach((si) => {
      const ds = datasets[si];
      const color = seriesColor(this.theme, ds, si);
      this.ctx.strokeStyle = color;
      this.ctx.lineWidth = lineW;
      this.ctx.lineJoin = 'round';
      this.ctx.beginPath();
      for (let i = 0; i < n; i++) {
        const x = p.x + (i + 0.5) * slot;
        const y = yOfNoT(ds.data[i] ?? 0);
        if (i === 0) this.ctx.moveTo(x, y); else this.ctx.lineTo(x, y);
      }
      this.ctx.stroke();
      // Dots.
      for (let i = 0; i < n; i++) {
        const x = p.x + (i + 0.5) * slot;
        const y = yOfNoT(ds.data[i] ?? 0);
        this.ctx.beginPath();
        this.ctx.arc(x, y, safeRadius(i === this.hoverIndex ? 4 : 2.5), 0, Math.PI * 2);
        this.ctx.fillStyle = color;
        this.ctx.fill();
      }
    });

    if (this.hoverIndex >= 0) this._drawCrosshair(this.hoverIndex, /*centered=*/ true);
  }
}
