import type { BulletChartConfig, BulletItem, DataMapping } from '../types';
import { BaseChart } from '../core/base';
import { hexToRgba, arrayMax, safeRadius, safeDim } from '../utils/helpers';

/**
 * Bullet chart (Stephen Few). One row per KPI: a current measure, a target
 * marker, and qualitative range bands.
 *
 * @example
 * ```ts
 * new BulletChart('#chart').setData([
 *   { label: 'Revenue', value: 84, target: 90, ranges: [60, 80, 100] },
 *   { label: 'Profit',  value: 32, target: 40, ranges: [20, 35, 50] },
 * ]);
 * ```
 */
export class BulletChart extends BaseChart {
  declare config: BulletChartConfig & BaseChart['config'];

  private _items: BulletItem[] = [];

  constructor(container: HTMLElement | string, config: BulletChartConfig = {}) {
    super(container, {
      padding: { top: 30, right: 30, bottom: 20, left: 110 },
      showGrid: false, showLegend: false,
      ...config,
    });
  }

  setData(data: Record<string, any>[] | null | undefined, mapping?: DataMapping): void {
    const labelKey = mapping?.labelField ?? mapping?.x ?? 'label';
    const valKey = mapping?.valueField ?? (mapping?.y as string) ?? 'value';
    this._items = (data || []).map((d) => ({
      label: String(d[labelKey] ?? ''),
      value: +d[valKey] || 0,
      target: d.target != null ? +d.target : undefined,
      ranges: Array.isArray(d.ranges) ? d.ranges.map(Number) : undefined,
    }));
    this.resolved = { labels: this._items.map((d) => d.label), datasets: [] };
    this._animate();
  }

  _onMouse(e: MouseEvent): void {
    const n = this._items.length;
    this.hoverIndex = this._idxFromY(e, n);
    if (this.hoverIndex >= 0 && this.tooltip) {
      const p = this.plotArea;
      const slot = p.h / n;
      const d = this._items[this.hoverIndex];
      this.tooltip.showStructured(p.x + p.w / 2, p.y + (this.hoverIndex + 0.5) * slot, {
        title: d.label,
        rows: [
          { label: 'value', value: this._fmtVal(d.value), color: this.theme.colors[0] },
          ...(d.target != null
            ? [{ label: 'target', value: this._fmtVal(d.target), color: this.theme.text }]
            : []),
        ],
      });
    }
    this._draw();
  }

  _draw(): void {
    if (!this._items.length) return;
    this._drawBg();
    this._drawTitle();
    const p = this.plotArea;
    const n = this._items.length;
    const slot = p.h / n;
    const t = this.animProgress;
    const ff = this._fontFamily();
    const rangeColor = this.config.rangeColor || hexToRgba(this.theme.text, 0.18);

    for (let i = 0; i < n; i++) {
      const d = this._items[i];
      const yC = p.y + (i + 0.5) * slot;
      const barH = Math.min(20, slot * 0.55);
      // Domain for this row: max of ranges, value, target.
      const lim = Math.max(
        d.ranges ? arrayMax(d.ranges) : 0,
        d.value,
        d.target ?? 0,
        1,
      );
      const xFor = (v: number) => p.x + (v / lim) * p.w * t;

      // Qualitative range bands (light → dark from low to high). Rounded
      // ends on the outermost band, square joins between adjacent bands.
      if (d.ranges?.length) {
        const rs = d.ranges.slice().sort((a, b) => a - b);
        const trackR = safeRadius(barH * 0.45);
        let prev = 0;
        rs.forEach((r, ri) => {
          const x0 = xFor(prev);
          const w = xFor(r) - x0;
          if (w <= 0) { prev = r; return; }
          this.ctx.fillStyle = ri === rs.length - 1
            ? rangeColor
            : hexToRgba(this.theme.text, 0.08 + ri * 0.04);
          const isFirst = ri === 0;
          const isLast = ri === rs.length - 1;
          const tl = isFirst ? trackR : 0;
          const bl = isFirst ? trackR : 0;
          const tr = isLast ? trackR : 0;
          const br = isLast ? trackR : 0;
          this.ctx.beginPath();
          this.ctx.roundRect(x0, yC - barH * 0.7, safeDim(w), safeDim(barH * 1.4), [tl, tr, br, bl] as any);
          this.ctx.fill();
          prev = r;
        });
      }

      // Value bar — rounded right end, hover glow.
      const isHover = i === this.hoverIndex;
      const color = this.theme.colors[i % this.theme.colors.length];
      const valW = xFor(d.value) - p.x;
      this.ctx.fillStyle = isHover ? color : hexToRgba(color, 0.9);
      if (isHover) {
        this.ctx.shadowColor = hexToRgba(color, 0.35);
        this.ctx.shadowBlur = 10;
      }
      const valR = safeRadius(Math.min(barH / 2, valW / 2));
      this.ctx.beginPath();
      this.ctx.roundRect(p.x, yC - barH / 2, safeDim(valW), safeDim(barH), valR);
      this.ctx.fill();
      this.ctx.shadowBlur = 0;

      // Target tick — extends slightly above and below the value bar.
      if (d.target != null) {
        const tx = xFor(d.target);
        this.ctx.strokeStyle = this.theme.text;
        this.ctx.lineWidth = 2.5;
        this.ctx.lineCap = 'round';
        this.ctx.beginPath();
        this.ctx.moveTo(tx, yC - barH * 0.85);
        this.ctx.lineTo(tx, yC + barH * 0.85);
        this.ctx.stroke();
      }

      // Label (left of axis).
      this.ctx.fillStyle = isHover ? this.theme.text : this.theme.textMuted;
      this.ctx.font = `500 11px ${ff}`;
      this.ctx.textAlign = 'right';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(this._truncate(d.label, 14), p.x - 8, yC);
    }
  }
}
