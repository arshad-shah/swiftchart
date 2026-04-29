import type { FunnelChartConfig, FunnelItem, DataMapping } from '../types';
import { BaseChart } from '../core/base';
import { hexToRgba } from '../utils/helpers';

/**
 * Conversion funnel chart. Each stage is drawn as a centred trapezoid whose
 * width is proportional to its value relative to the first stage.
 *
 * Set `pyramid: true` to point the funnel downward (largest at top).
 *
 * @example
 * ```ts
 * new FunnelChart('#chart').setData([
 *   { stage: 'Visited',   value: 10000 },
 *   { stage: 'Signup',    value: 4200 },
 *   { stage: 'Activated', value: 2100 },
 *   { stage: 'Paid',      value: 480 },
 * ], { labelField: 'stage', valueField: 'value' });
 * ```
 */
export class FunnelChart extends BaseChart {
  declare config: FunnelChartConfig & BaseChart['config'];

  private _items: FunnelItem[] = [];

  constructor(container: HTMLElement | string, config: FunnelChartConfig = {}) {
    super(container, {
      padding: { top: 30, right: 30, bottom: 20, left: 30 },
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
    })).filter((d) => d.value > 0);
    this.resolved = { labels: this._items.map((d) => d.label), datasets: [] };
    this._animate();
  }

  _onMouse(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const my = e.clientY - rect.top;
    const p = this.plotArea;
    const n = this._items.length;
    if (!n) return;
    const slot = p.h / n;
    const idx = Math.floor((my - p.y) / slot);
    this.hoverIndex = idx >= 0 && idx < n ? idx : -1;
    if (this.hoverIndex >= 0 && this.tooltip) {
      const d = this._items[this.hoverIndex];
      const top = this._items[0].value || 1;
      const prev = this.hoverIndex > 0 ? this._items[this.hoverIndex - 1].value : top;
      const conv = ((d.value / top) * 100).toFixed(1);
      const drop = prev > 0 ? (((prev - d.value) / prev) * 100).toFixed(1) : '0.0';
      this.tooltip.showStructured(p.x + p.w / 2, p.y + (idx + 0.5) * slot, {
        title: d.label,
        rows: [
          { label: 'value', value: this._fmtVal(d.value), color: this.theme.colors[0] },
          { label: 'of top', value: `${conv}%` },
          { label: 'drop', value: `${drop}%`, color: this.theme.negative },
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
    const top = this._items[0].value || 1;
    const slotH = p.h / n;
    const t = this.animProgress;
    const showPct = this.config.showPercent !== false;
    const pyramid = !!this.config.pyramid;
    const ff = this._fontFamily();

    for (let i = 0; i < n; i++) {
      const d = this._items[i];
      const next = this._items[i + 1];
      const w0 = (d.value / top) * p.w * t;
      const w1 = ((next ? next.value : d.value * 0.6) / top) * p.w * t;
      const idxFromTop = pyramid ? n - 1 - i : i;
      const y0 = p.y + idxFromTop * slotH;
      const y1 = y0 + slotH - 2;
      const cx = p.x + p.w / 2;
      const color = this.theme.colors[i % this.theme.colors.length];
      const isHover = i === this.hoverIndex;

      this.ctx.beginPath();
      this.ctx.moveTo(cx - w0 / 2, y0);
      this.ctx.lineTo(cx + w0 / 2, y0);
      this.ctx.lineTo(cx + w1 / 2, y1);
      this.ctx.lineTo(cx - w1 / 2, y1);
      this.ctx.closePath();
      this.ctx.fillStyle = isHover ? color : hexToRgba(color, 0.85);
      if (isHover) { this.ctx.shadowColor = hexToRgba(color, 0.4); this.ctx.shadowBlur = 12; }
      this.ctx.fill();
      this.ctx.shadowBlur = 0;

      // Label (centre of trapezoid).
      this.ctx.fillStyle = this.theme.onAccent;
      this.ctx.font = `600 12px ${ff}`;
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      const labelMain = `${d.label}  ${this._fmtVal(d.value)}`;
      this.ctx.fillText(labelMain, cx, y0 + slotH / 2 - (showPct ? 7 : 0));
      if (showPct) {
        const pct = ((d.value / top) * 100).toFixed(1);
        this.ctx.font = `400 10px ${ff}`;
        this.ctx.fillStyle = hexToRgba(this.theme.onAccent, 0.7);
        this.ctx.fillText(`${pct}%`, cx, y0 + slotH / 2 + 8);
      }
    }
  }
}
