import { BaseChart } from '../core/base';
import { hexToRgba, arrayMin, arrayMax } from '../utils/helpers';

/**
 * Minimal axis-less inline chart, designed for tight spaces (table cells, KPIs).
 *
 * @example
 * ```ts
 * import { Sparkline } from '@arshad-shah/swift-chart';
 *
 * const chart = new Sparkline('#chart', { theme: 'midnight' });
 * chart.setData([12, 14, 13, 18, 22, 20, 26]);
 * ```
 */
export class Sparkline extends BaseChart {
  declare config: { color?: string; filled?: boolean } & BaseChart['config'];

  private _values: number[] = [];

  // Read from this.config so prop updates propagate.
  private get _color(): string { return this.config.color || this.theme.colors[0]; }
  private get _filled(): boolean { return this.config.filled !== false; }

  constructor(container: HTMLElement | string, config: any = {}) {
    super(container, {
      padding: { top: 4, right: 4, bottom: 4, left: 4 },
      showGrid: false, showLegend: false, showTooltip: false,
      ...config,
    });
  }

  setData(values: number[] | Record<string, any>[] | null | undefined): void {
    this._values = Array.isArray(values)
      ? values.map((v) => (typeof v === 'number' ? v : 0))
      : [];
    this._animate();
  }

  _onMouse(_e: MouseEvent): void {}

  _draw(): void {
    if (!this._values.length) return;
    this._drawBg();
    const p = this.plotArea;
    const vals = this._values;
    const min = arrayMin(vals);
    const max = arrayMax(vals);
    const range = max - min || 1;
    const stepW = p.w / Math.max(1, vals.length - 1);
    const t = this.animProgress;
    const color = this._color;

    const points = vals.map((v, i) => ({
      x: p.x + i * stepW,
      y: p.y + p.h - ((v - min) / range) * p.h,
    }));

    this.ctx.save();
    this.ctx.beginPath();
    this.ctx.rect(p.x, p.y, p.w * t, p.h);
    this.ctx.clip();

    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = 1.5;
    this.ctx.lineJoin = 'round';
    this.ctx.beginPath();
    points.forEach((pt, i) => (i === 0 ? this.ctx.moveTo(pt.x, pt.y) : this.ctx.lineTo(pt.x, pt.y)));
    this.ctx.stroke();

    if (this._filled) {
      this.ctx.lineTo(points[points.length - 1].x, p.y + p.h);
      this.ctx.lineTo(points[0].x, p.y + p.h);
      this.ctx.closePath();
      const grad = this.ctx.createLinearGradient(0, p.y, 0, p.y + p.h);
      grad.addColorStop(0, hexToRgba(color, 0.2));
      grad.addColorStop(1, hexToRgba(color, 0));
      this.ctx.fillStyle = grad;
      this.ctx.fill();
    }

    const last = points[points.length - 1];
    this.ctx.beginPath();
    this.ctx.arc(last.x, last.y, 2.5, 0, Math.PI * 2);
    this.ctx.fillStyle = color;
    this.ctx.fill();

    this.ctx.restore();
  }
}
