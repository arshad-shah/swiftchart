import type { PieChartConfig, DataMapping } from '../types';
import { BaseChart } from '../core/base';
import { hexToRgba, resolveData, safeRadius } from '../utils/helpers';

/**
 * Canvas 2D pie or donut chart.
 *
 * Set `donut: true` and tune `donutWidth` (0 to 1) to render a ring.
 *
 * @example
 * ```ts
 * import { PieChart } from '@arshad-shah/swift-chart';
 *
 * const chart = new PieChart('#chart', { donut: true, donutWidth: 0.55 });
 * chart.setData(
 *   [
 *     { source: 'Organic', visits: 4200 },
 *     { source: 'Direct',  visits: 3100 },
 *   ],
 *   { labelField: 'source', valueField: 'visits' },
 * );
 * ```
 *
 * @see {@link PieChartConfig}
 */
export class PieChart extends BaseChart {
  declare config: PieChartConfig & BaseChart['config'];

  // Read from `this.config` so prop updates take effect immediately.
  private get _donut(): boolean { return !!this.config.donut; }
  private get _donutWidth(): number {
    const w = this.config.donutWidth;
    return typeof w === 'number' ? Math.max(0, Math.min(0.95, w)) : 0.55;
  }

  constructor(container: HTMLElement | string, config: PieChartConfig = {}) {
    super(container, { padding: { top: 30, right: 20, bottom: 20, left: 20 }, ...config });
  }

  setData(data: Record<string, any>[] | null | undefined, mapping?: DataMapping): void {
    if (Array.isArray(data) && data.length && typeof data[0] === 'object') {
      const labelKey = mapping?.labelField || mapping?.x ||
        Object.keys(data[0]).find(k => typeof data[0][k] === 'string') || Object.keys(data[0])[0];
      const valKey = mapping?.valueField || mapping?.y as string ||
        Object.keys(data[0]).find(k => typeof data[0][k] === 'number' && k !== labelKey);
      this.resolved = {
        labels: data.map(d => String(d[labelKey])),
        datasets: [{ data: data.map(d => Number(d[valKey!]) || 0), label: 'Values' }],
      };
    } else if (mapping?.labels && mapping?.values) {
      this.resolved = {
        labels: mapping.labels,
        datasets: [{ data: mapping.values, label: 'Values' }],
      };
    } else {
      this.resolved = resolveData(data, { ...this.config, ...mapping } as DataMapping);
    }
    this._animate();
  }

  _onMouse(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const p = this.plotArea;
    const cx = p.x + p.w / 2;
    const cy = p.y + p.h / 2;
    const r = safeRadius(Math.min(p.w, p.h) / 2 - 10);
    const dist = Math.hypot(mx - cx, my - cy);
    const innerR = this._donut ? r * this._donutWidth : 0;

    if (dist > r || dist < innerR) {
      this.hoverIndex = -1;
      this.tooltip?.hide();
      this._draw();
      return;
    }

    let angle = Math.atan2(my - cy, mx - cx) + Math.PI / 2;
    if (angle < 0) angle += Math.PI * 2;

    const vals = this.resolved.datasets[0]?.data || [];
    const total = vals.reduce((a, b) => a + b, 0);
    if (total <= 0) {
      this.hoverIndex = -1;
      this.tooltip?.hide();
      this._draw();
      return;
    }

    let cumAngle = 0;
    this.hoverIndex = -1;
    for (let i = 0; i < vals.length; i++) {
      const sliceAngle = (vals[i] / total) * Math.PI * 2;
      if (angle >= cumAngle && angle < cumAngle + sliceAngle) {
        this.hoverIndex = i;
        break;
      }
      cumAngle += sliceAngle;
    }

    if (this.hoverIndex >= 0 && this.tooltip) {
      const pct = ((vals[this.hoverIndex] / total) * 100).toFixed(1);
      const color = this.theme.colors[this.hoverIndex % this.theme.colors.length];
      this.tooltip.showStructured(mx, my, {
        title: this.resolved.labels[this.hoverIndex],
        rows: [{
          label: 'Value',
          value: `${this._fmtVal(vals[this.hoverIndex])} (${pct}%)`,
          color,
        }],
      });
    }
    this._draw();
  }

  _draw(): void {
    const { labels, datasets } = this.resolved;
    if (!labels.length || !datasets.length) return;

    this._drawBg();
    this._drawTitle();

    const p = this.plotArea;
    const cx = p.x + p.w / 2;
    const cy = p.y + p.h / 2;
    const r = safeRadius(Math.min(p.w, p.h) / 2 - 10);
    const innerR = safeRadius(this._donut ? r * this._donutWidth : 0);
    const vals = datasets[0].data;
    const total = vals.reduce((a, b) => a + b, 0);
    if (total <= 0 || r <= 0) return;
    const t = this.animProgress;

    let startAngle = -Math.PI / 2;
    vals.forEach((val, i) => {
      const sliceAngle = (val / total) * Math.PI * 2 * t;
      const color = this.theme.colors[i % this.theme.colors.length];
      const isHover = i === this.hoverIndex;
      const midAngle = startAngle + sliceAngle / 2;
      const offset = isHover ? 6 : 0;
      const ox = Math.cos(midAngle) * offset;
      const oy = Math.sin(midAngle) * offset;

      this.ctx.beginPath();
      this.ctx.moveTo(
        cx + ox + Math.cos(startAngle) * innerR,
        cy + oy + Math.sin(startAngle) * innerR
      );
      this.ctx.arc(cx + ox, cy + oy, r, startAngle, startAngle + sliceAngle);
      this.ctx.arc(cx + ox, cy + oy, innerR, startAngle + sliceAngle, startAngle, true);
      this.ctx.closePath();
      this.ctx.fillStyle = isHover ? color : hexToRgba(color, 0.85);
      if (isHover) {
        this.ctx.shadowColor = hexToRgba(color, 0.4);
        this.ctx.shadowBlur = 16;
      }
      this.ctx.fill();
      this.ctx.shadowBlur = 0;

      startAngle += sliceAngle;
    });

    // Center label for donut
    if (this._donut && this.hoverIndex >= 0) {
      const ff = this._fontFamily();
      this.ctx.fillStyle = this.theme.text;
      this.ctx.font = `700 18px ${ff}`;
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(this._fmtVal(vals[this.hoverIndex]), cx, cy - 6);
      this.ctx.fillStyle = this.theme.textMuted;
      this.ctx.font = `400 11px ${ff}`;
      this.ctx.fillText(labels[this.hoverIndex], cx, cy + 12);
    }
  }
}
