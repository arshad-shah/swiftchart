import type { BaseChartConfig } from '../types';
import { BaseChart } from '../core/base';
import { niceScale, hexToRgba, arraysExtent, safeRadius } from '../utils/helpers';

/**
 * Canvas 2D vertical bar chart. Pass multiple Y fields for grouped bars.
 *
 * @example
 * ```ts
 * import { BarChart } from '@arshad-shah/swift-chart';
 *
 * const chart = new BarChart('#chart', { theme: 'arctic' });
 * chart.setData(
 *   [
 *     { region: 'NA', sales: 240 },
 *     { region: 'EU', sales: 180 },
 *   ],
 *   { x: 'region', y: 'sales' },
 * );
 * ```
 *
 * @see {@link BaseChartConfig}
 */
export class BarChart extends BaseChart {
  constructor(container: HTMLElement | string, config: BaseChartConfig = {}) {
    super(container, config);
  }

  _onMouse(e: MouseEvent): void {
    const n = this.resolved.labels.length;
    this.hoverIndex = this._idxFromX(e, n);
    if (this.hoverIndex >= 0 && this.tooltip) {
      const p = this.plotArea;
      const barW = p.w / n;
      this.tooltip.showStructured(
        p.x + (this.hoverIndex + 0.5) * barW,
        p.y + p.h / 2,
        this._tooltipContent(this.hoverIndex),
      );
    }
    this._draw();
  }

  _draw(): void {
    const { labels, datasets } = this.resolved;
    if (!labels.length) return;

    this._drawBg();
    this._drawTitle();

    let [minV, maxV] = arraysExtent(datasets.map(d => d.data));
    // Always include zero on the value axis so bars have a sensible baseline
    // regardless of sign distribution.
    if (minV > 0) minV = 0;
    if (maxV < 0) maxV = 0;
    const scale = niceScale(minV, maxV);
    const p = this.plotArea;

    this._drawGrid(scale);
    this._drawXLabels(labels, /*centered=*/true);
    this._drawLegend();

    const n = labels.length;
    const groupW = p.w / n;
    const numSeries = datasets.length;
    const barGap = 2;
    const groupPad = groupW * 0.2;
    const barW = Math.max(1, (groupW - groupPad * 2 - barGap * (numSeries - 1)) / numSeries);
    const t = this.animProgress;
    const range = scale.max - scale.min || 1;
    const zeroY = p.y + p.h - ((0 - scale.min) / range) * p.h;

    datasets.forEach((ds, si) => {
      const color = ds.color || this.theme.colors[si % this.theme.colors.length];
      ds.data.forEach((val, i) => {
        const xStart = p.x + i * groupW + groupPad + si * (barW + barGap);
        const rawH = (Math.abs(val) / range) * p.h * t;
        const rawY = val >= 0 ? zeroY - rawH : zeroY;
        const isHover = i === this.hoverIndex;

        this.ctx.fillStyle = isHover ? hexToRgba(color, 1) : hexToRgba(color, 0.8);
        if (isHover) {
          this.ctx.shadowColor = hexToRgba(color, 0.4);
          this.ctx.shadowBlur = 12;
        }

        const r = safeRadius(Math.min(4, barW / 2, Math.abs(rawH) / 2));
        this.ctx.beginPath();
        if (val >= 0) {
          this.ctx.moveTo(xStart, rawY + rawH);
          this.ctx.lineTo(xStart, rawY + r);
          this.ctx.quadraticCurveTo(xStart, rawY, xStart + r, rawY);
          this.ctx.lineTo(xStart + barW - r, rawY);
          this.ctx.quadraticCurveTo(xStart + barW, rawY, xStart + barW, rawY + r);
          this.ctx.lineTo(xStart + barW, rawY + rawH);
        } else {
          this.ctx.moveTo(xStart, rawY);
          this.ctx.lineTo(xStart, rawY + rawH - r);
          this.ctx.quadraticCurveTo(xStart, rawY + rawH, xStart + r, rawY + rawH);
          this.ctx.lineTo(xStart + barW - r, rawY + rawH);
          this.ctx.quadraticCurveTo(xStart + barW, rawY + rawH, xStart + barW, rawY + rawH - r);
          this.ctx.lineTo(xStart + barW, rawY);
        }
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.shadowBlur = 0;
      });
    });
  }
}
