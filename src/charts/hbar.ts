import type { BaseChartConfig } from '../types';
import { BaseChart } from '../core/base';
import { hexToRgba, arraysExtent } from '../utils/helpers';
import { roundedBar, datumColor } from '../core/draw';

/** Horizontal bar chart configuration. */
export interface HBarChartConfig extends BaseChartConfig {
  /**
   * Fraction of each row's slot occupied by the bar (0–1). Default `0.6`.
   * Higher = thicker bars with smaller gaps; lower = thinner bars.
   */
  barRatio?: number;
}

/**
 * Canvas 2D horizontal bar chart. Best for ranked lists or long category labels.
 *
 * Mapping convention: `x` is the categorical label field, `y` is the numeric
 * value field (the bar length).
 *
 * @example
 * ```ts
 * import { HBarChart } from '@arshad-shah/swift-chart';
 *
 * const chart = new HBarChart('#chart', { theme: 'midnight' });
 * chart.setData(traffic, { x: 'source', y: 'visits' });
 * ```
 */
export class HBarChart extends BaseChart {
  constructor(container: HTMLElement | string, config: HBarChartConfig = {}) {
    // Default padding is intentionally tight: base.ts adds extra space for the
    // title and legend on top of these values, so reserving large top/bottom
    // padding here would leave dead space when neither is shown.
    super(container, { padding: { top: 8, right: 12, bottom: 8, left: 90 }, ...config });
  }

  _onMouse(e: MouseEvent): void {
    const n = this.resolved.labels.length;
    this.hoverIndex = this._idxFromY(e, n);
    if (this.hoverIndex >= 0 && this.tooltip) {
      const p = this.plotArea;
      const slot = p.h / n;
      this.tooltip.showStructured(
        p.x + p.w / 2, p.y + (this.hoverIndex + 0.5) * slot,
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
    this._drawLegend();
    const [, maxV] = arraysExtent(datasets.map((d) => d.data));
    const maxVal = Math.max(maxV, 1);
    const p = this.plotArea;
    const n = labels.length;
    const slot = p.h / n;
    const ratio = Math.min(1, Math.max(0.05, (this.config as HBarChartConfig).barRatio ?? 0.6));
    const barH = slot * ratio;
    const gap = slot * (1 - ratio);
    const t = this.animProgress;
    const ff = this._fontFamily();
    const colorFn = this.config.colorFn;

    labels.forEach((label, i) => {
      this.ctx.fillStyle = i === this.hoverIndex ? this.theme.text : this.theme.textMuted;
      this.ctx.font = `400 11px ${ff}`;
      this.ctx.textAlign = 'right';
      this.ctx.textBaseline = 'middle';
      const yCenter = p.y + i * slot + slot / 2;
      const display = String(label).length > 12 ? String(label).slice(0, 11) + '…' : String(label);
      this.ctx.fillText(display, p.x - 8, yCenter);

      datasets.forEach((ds, si) => {
        const color = datumColor(this.theme, ds, si, i, colorFn);
        const val = ds.data[i];
        const w = (val / maxVal) * p.w * t;
        const y = p.y + i * slot + gap / 2;
        const isHover = i === this.hoverIndex;
        const r = Math.min(4, barH / 2);
        // Round only the right end (the bar-tip) so adjacent bars in groups
        // stay visually anchored to the y-axis.
        roundedBar(this.ctx, p.x, y, w, barH,
          isHover ? color : hexToRgba(color, 0.75),
          { radii: [0, r, r, 0], hover: isHover, glowColor: color });

        if (w > 40) {
          this.ctx.fillStyle = this.theme.onAccent;
          this.ctx.font = `500 10px ${ff}`;
          this.ctx.textAlign = 'right';
          this.ctx.textBaseline = 'middle';
          this.ctx.fillText(this._fmtVal(val), p.x + w - 8, yCenter);
        }
      });
    });
  }
}
