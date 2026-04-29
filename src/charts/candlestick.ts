import type { CandlestickChartConfig, CandlestickItem, DataMapping } from '../types';
import { BaseChart } from '../core/base';
import { niceScale, hexToRgba, safeDim } from '../utils/helpers';

/**
 * Canvas 2D OHLC candlestick chart. Each row needs `open`, `high`, `low`,
 * `close`. Wicks colour-code by direction (up vs. down).
 *
 * @example
 * ```ts
 * new CandlestickChart('#chart').setData(daily, {
 *   labelField: 'date',
 *   // OHLC fields auto-detected from row keys when names match.
 * });
 * ```
 */
export class CandlestickChart extends BaseChart {
  declare config: CandlestickChartConfig & BaseChart['config'];

  private _items: CandlestickItem[] = [];

  setData(data: Record<string, any>[] | null | undefined, mapping?: DataMapping): void {
    const labelKey = mapping?.labelField ?? mapping?.x ?? 'label';
    this._items = (data || []).map((d) => ({
      label: String(d[labelKey] ?? ''),
      open: +d.open,
      high: +d.high,
      low: +d.low,
      close: +d.close,
    })).filter((d) =>
      Number.isFinite(d.open) && Number.isFinite(d.close) &&
      Number.isFinite(d.high) && Number.isFinite(d.low),
    );
    this.resolved = { labels: this._items.map((d) => d.label), datasets: [] };
    this._animate();
  }

  _onMouse(e: MouseEvent): void {
    const n = this._items.length;
    this.hoverIndex = this._idxFromX(e, n);
    if (this.hoverIndex >= 0 && this.tooltip) {
      const p = this.plotArea;
      const slot = p.w / n;
      const d = this._items[this.hoverIndex];
      const up = d.close >= d.open;
      const color = up
        ? this.config.upColor || this.theme.positive
        : this.config.downColor || this.theme.negative;
      this.tooltip.showStructured(p.x + (this.hoverIndex + 0.5) * slot, p.y + p.h / 2, {
        title: d.label,
        rows: [
          { label: 'O', value: this._fmtVal(d.open) },
          { label: 'H', value: this._fmtVal(d.high), color: this.theme.positive },
          { label: 'L', value: this._fmtVal(d.low),  color: this.theme.negative },
          { label: 'C', value: this._fmtVal(d.close), color },
        ],
      });
    }
    this._draw();
  }

  _draw(): void {
    if (!this._items.length) return;
    this._drawBg();
    this._drawTitle();

    let lo = Infinity, hi = -Infinity;
    for (const d of this._items) {
      if (d.low < lo) lo = d.low;
      if (d.high > hi) hi = d.high;
    }
    const scale = niceScale(lo, hi);
    const p = this.plotArea;
    this._drawGrid(scale);
    this._drawXLabels(this._items.map((d) => d.label), /*centered=*/ true);

    const n = this._items.length;
    const slot = p.w / n;
    const bodyW = Math.max(1, Math.min(slot * 0.6, 16));
    const range = scale.max - scale.min || 1;
    const t = this.animProgress;
    const upColor = this.config.upColor || this.theme.positive;
    const downColor = this.config.downColor || this.theme.negative;

    const yFor = (v: number) => p.y + p.h - ((v - scale.min) / range) * p.h * t;

    for (let i = 0; i < n; i++) {
      const d = this._items[i];
      const cx = p.x + (i + 0.5) * slot;
      const yh = yFor(d.high);
      const yl = yFor(d.low);
      const yo = yFor(d.open);
      const yc = yFor(d.close);
      const up = d.close >= d.open;
      const color = up ? upColor : downColor;
      const isHover = i === this.hoverIndex;

      // Wick.
      this.ctx.strokeStyle = hexToRgba(color, isHover ? 1 : 0.85);
      this.ctx.lineWidth = 1.2;
      this.ctx.beginPath();
      this.ctx.moveTo(cx, yh);
      this.ctx.lineTo(cx, yl);
      this.ctx.stroke();

      // Body.
      const top = Math.min(yo, yc);
      const h = safeDim(Math.abs(yo - yc) || 1);
      this.ctx.fillStyle = isHover ? color : hexToRgba(color, 0.7);
      this.ctx.fillRect(cx - bodyW / 2, top, bodyW, h);
      if (!up) {
        // Hollow body for down candles can be busy on small ranges; stick with filled.
      }
    }
  }
}
