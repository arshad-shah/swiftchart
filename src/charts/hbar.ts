import type { BaseChartConfig } from '../types';
import { BaseChart } from '../core/base';
import { hexToRgba, arraysExtent, safeRadius } from '../utils/helpers';

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
  constructor(container: HTMLElement | string, config: BaseChartConfig = {}) {
    super(container, { padding: { top: 30, right: 20, bottom: 20, left: 90 }, ...config });
  }

  _onMouse(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const my = e.clientY - rect.top;
    const p = this.plotArea;
    const n = this.resolved.labels.length;
    if (!n) return;
    const slot = p.h / n;
    const idx = Math.floor((my - p.y) / slot);
    this.hoverIndex = idx >= 0 && idx < n ? idx : -1;
    if (this.hoverIndex >= 0 && this.tooltip) {
      this.tooltip.showStructured(
        p.x + p.w / 2, p.y + (idx + 0.5) * slot,
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
    const barH = slot * 0.6;
    const gap = slot * 0.4;
    const t = this.animProgress;
    const ff = this._fontFamily();

    labels.forEach((label, i) => {
      this.ctx.fillStyle = i === this.hoverIndex ? this.theme.text : this.theme.textMuted;
      this.ctx.font = `400 11px ${ff}`;
      this.ctx.textAlign = 'right';
      this.ctx.textBaseline = 'middle';
      const yCenter = p.y + i * slot + slot / 2;
      const display = String(label).length > 12 ? String(label).slice(0, 11) + '…' : String(label);
      this.ctx.fillText(display, p.x - 8, yCenter);

      datasets.forEach((ds, si) => {
        const color = ds.color || this.theme.colors[si % this.theme.colors.length];
        const val = ds.data[i];
        const w = (val / maxVal) * p.w * t;
        const y = p.y + i * slot + gap / 2;
        const isHover = i === this.hoverIndex;

        this.ctx.fillStyle = isHover ? color : hexToRgba(color, 0.75);
        if (isHover) { this.ctx.shadowColor = hexToRgba(color, 0.3); this.ctx.shadowBlur = 10; }
        const r = safeRadius(Math.min(4, barH / 2));
        this.ctx.beginPath();
        this.ctx.moveTo(p.x, y);
        this.ctx.lineTo(p.x + w - r, y);
        this.ctx.quadraticCurveTo(p.x + w, y, p.x + w, y + r);
        this.ctx.lineTo(p.x + w, y + barH - r);
        this.ctx.quadraticCurveTo(p.x + w, y + barH, p.x + w - r, y + barH);
        this.ctx.lineTo(p.x, y + barH);
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.shadowBlur = 0;

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
