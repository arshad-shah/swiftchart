import type { BaseChartConfig } from '../types';
import { BaseChart } from '../core/base';
import { hexToRgba, arraysExtent } from '../utils/helpers';

/**
 * Canvas 2D radar / spider chart for multi-axis comparison.
 *
 * @example
 * ```ts
 * import { RadarChart } from '@arshad-shah/swift-chart';
 *
 * const chart = new RadarChart('#chart', { theme: 'midnight' });
 * chart.setData(skills, { x: 'axis', y: ['teamA', 'teamB'] });
 * ```
 */
export class RadarChart extends BaseChart {
  constructor(container: HTMLElement | string, config: BaseChartConfig = {}) {
    super(container, { padding: { top: 30, right: 40, bottom: 20, left: 40 }, ...config });
  }

  _onMouse(_e: MouseEvent): void {
    // Radar doesn't need per-point hover for now.
  }

  _draw(): void {
    const { labels, datasets } = this.resolved;
    if (!labels.length) return;
    this._drawBg();
    this._drawTitle();
    this._drawLegend();
    const p = this.plotArea;
    const cx = p.x + p.w / 2, cy = p.y + p.h / 2;
    const r = Math.min(p.w, p.h) / 2 - 20;
    if (r <= 0) return;
    const n = labels.length;
    const t = this.animProgress;
    const [, maxV] = arraysExtent(datasets.map((d) => d.data));
    const maxVal = Math.max(maxV, 1);
    const levels = 5;
    const ff = this._fontFamily();

    for (let l = 1; l <= levels; l++) {
      const lr = (l / levels) * r;
      this.ctx.strokeStyle = this.theme.grid;
      this.ctx.lineWidth = 1;
      this.ctx.beginPath();
      for (let i = 0; i <= n; i++) {
        const angle = (i % n) * (Math.PI * 2 / n) - Math.PI / 2;
        const x = cx + Math.cos(angle) * lr, y = cy + Math.sin(angle) * lr;
        if (i === 0) this.ctx.moveTo(x, y); else this.ctx.lineTo(x, y);
      }
      this.ctx.stroke();
    }
    for (let i = 0; i < n; i++) {
      const angle = i * (Math.PI * 2 / n) - Math.PI / 2;
      const x = cx + Math.cos(angle) * r, y = cy + Math.sin(angle) * r;
      this.ctx.strokeStyle = this.theme.grid;
      this.ctx.beginPath();
      this.ctx.moveTo(cx, cy);
      this.ctx.lineTo(x, y);
      this.ctx.stroke();
      const lx = cx + Math.cos(angle) * (r + 14), ly = cy + Math.sin(angle) * (r + 14);
      this.ctx.fillStyle = this.theme.textMuted;
      this.ctx.font = `400 10px ${ff}`;
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(labels[i], lx, ly);
    }
    datasets.forEach((ds, si) => {
      const color = ds.color || this.theme.colors[si % this.theme.colors.length];
      this.ctx.beginPath();
      ds.data.forEach((val, i) => {
        const angle = i * (Math.PI * 2 / n) - Math.PI / 2;
        const dr = (val / maxVal) * r * t;
        const x = cx + Math.cos(angle) * dr, y = cy + Math.sin(angle) * dr;
        if (i === 0) this.ctx.moveTo(x, y); else this.ctx.lineTo(x, y);
      });
      this.ctx.closePath();
      this.ctx.fillStyle = hexToRgba(color, 0.15);
      this.ctx.fill();
      this.ctx.strokeStyle = color;
      this.ctx.lineWidth = 2;
      this.ctx.stroke();
      ds.data.forEach((val, i) => {
        const angle = i * (Math.PI * 2 / n) - Math.PI / 2;
        const dr = (val / maxVal) * r * t;
        const x = cx + Math.cos(angle) * dr, y = cy + Math.sin(angle) * dr;
        this.ctx.beginPath();
        this.ctx.arc(x, y, 3.5, 0, Math.PI * 2);
        this.ctx.fillStyle = color;
        this.ctx.fill();
      });
    });
  }
}
