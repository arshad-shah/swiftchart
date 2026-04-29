import type { RadialBarChartConfig } from '../types';
import { BaseChart } from '../core/base';
import { hexToRgba, arrayMax, safeRadius } from '../utils/helpers';

/**
 * Radial bar / rose chart. Each label becomes a wedge.
 * - Default: bar *length* encodes value (constant arc width).
 * - `rose: true`: bar *radius* encodes value (Coxcomb / Nightingale rose).
 *
 * @example
 * ```ts
 * new RadialBarChart('#chart').setData(traffic, { labelField: 'source', valueField: 'visits' });
 * ```
 */
export class RadialBarChart extends BaseChart {
  declare config: RadialBarChartConfig & BaseChart['config'];

  constructor(container: HTMLElement | string, config: RadialBarChartConfig = {}) {
    super(container, {
      padding: { top: 30, right: 20, bottom: 20, left: 20 },
      showGrid: false,
      ...config,
    });
  }

  _onMouse(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const p = this.plotArea;
    const cx = p.x + p.w / 2;
    const cy = p.y + p.h / 2;
    const r = safeRadius(Math.min(p.w, p.h) / 2 - 12);
    const innerR = r * (this.config.innerRadius ?? 0.3);
    const dist = Math.hypot(mx - cx, my - cy);
    if (dist < innerR || dist > r) {
      this.hoverIndex = -1;
      this.tooltip?.hide();
      this._draw();
      return;
    }
    const n = this.resolved.labels.length;
    if (!n) return;
    let angle = Math.atan2(my - cy, mx - cx) + Math.PI / 2;
    if (angle < 0) angle += Math.PI * 2;
    this.hoverIndex = Math.floor((angle / (Math.PI * 2)) * n);
    if (this.tooltip) {
      const v = this.resolved.datasets[0]?.data[this.hoverIndex] ?? 0;
      this.tooltip.showStructured(mx, my, {
        title: this.resolved.labels[this.hoverIndex],
        rows: [{ label: 'value', value: this._fmtVal(v),
          color: this.theme.colors[this.hoverIndex % this.theme.colors.length] }],
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
    const rOuter = safeRadius(Math.min(p.w, p.h) / 2 - 12);
    const rInner = safeRadius(rOuter * (this.config.innerRadius ?? 0.3));
    const vals = datasets[0].data;
    const maxV = arrayMax(vals) || 1;
    const n = vals.length;
    const sliceA = (Math.PI * 2) / n;
    const t = this.animProgress;
    const isRose = !!this.config.rose;

    for (let i = 0; i < n; i++) {
      const v = vals[i];
      const norm = v / maxV;
      const start = i * sliceA - Math.PI / 2;
      const end = start + sliceA * 0.92;
      const color = this.theme.colors[i % this.theme.colors.length];
      const isHover = i === this.hoverIndex;
      // Bar length mode: constant outer radius, variable inner edge.
      // Rose mode: variable outer radius.
      const drawOuter = isRose ? rInner + (rOuter - rInner) * norm * t : rOuter;
      const drawInner = isRose ? rInner : rOuter - (rOuter - rInner) * norm * t;

      this.ctx.fillStyle = isHover ? color : hexToRgba(color, 0.85);
      this.ctx.beginPath();
      this.ctx.arc(cx, cy, drawOuter, start, end);
      this.ctx.arc(cx, cy, drawInner, end, start, true);
      this.ctx.closePath();
      this.ctx.fill();
    }

    // Centre label.
    const ff = this._fontFamily();
    if (this.hoverIndex >= 0) {
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
