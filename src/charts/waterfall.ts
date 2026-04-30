import type { DataMapping, WaterfallItem } from '../types';
import { BaseChart } from '../core/base';
import { niceScale, hexToRgba, arrayMin, arrayMax } from '../utils/helpers';
import { roundedBar } from '../core/draw';

/**
 * Canvas 2D waterfall chart - visualises incremental positive/negative changes
 * around a running total.
 *
 * Each item's `value` adds (positive) or subtracts (negative) from the running
 * total.
 *
 * @example
 * ```ts
 * import { WaterfallChart } from '@arshad-shah/swift-chart';
 *
 * const chart = new WaterfallChart('#chart', { theme: 'midnight' });
 * chart.setData([
 *   { label: 'Q1',    value: 120 },
 *   { label: 'Q2 Δ',  value: 45 },
 *   { label: 'Q3 Δ',  value: -22 },
 *   { label: 'Q4 Δ',  value: 67 },
 * ]);
 * ```
 */
export class WaterfallChart extends BaseChart {
  private _wfData: WaterfallItem[] = [];

  setData(data: Record<string, any>[] | null | undefined, mapping?: DataMapping): void {
    const labelKey = mapping?.labelField || 'label';
    const valKey = mapping?.valueField || 'value';
    this._wfData = (data || []).map((d) => ({ label: String(d[labelKey]), value: +d[valKey] }));
    this._animate();
  }

  _onMouse(e: MouseEvent): void {
    const n = this._wfData.length;
    this.hoverIndex = this._idxFromX(e, n);
    if (this.hoverIndex >= 0 && this.tooltip) {
      const p = this.plotArea;
      const barW = p.w / n;
      const d = this._wfData[this.hoverIndex];
      let cumulative = 0;
      for (let i = 0; i <= this.hoverIndex; i++) cumulative += this._wfData[i].value;
      const sign = d.value >= 0 ? '+' : '';
      const color = d.value >= 0 ? this.theme.positive : this.theme.negative;
      this.tooltip.showStructured(p.x + (this.hoverIndex + 0.5) * barW, p.y + p.h / 2, {
        title: d.label,
        rows: [
          { label: 'Δ', value: `${sign}${this._fmtVal(d.value)}`, color },
          { label: 'Running', value: this._fmtVal(cumulative) },
        ],
      });
    }
    this._draw();
  }

  _draw(): void {
    if (!this._wfData.length) return;
    this._drawBg();
    this._drawTitle();
    const data = this._wfData;
    const n = data.length;
    const cumulative = [0];
    data.forEach((d, i) => cumulative.push(cumulative[i] + d.value));
    const lo = arrayMin(cumulative);
    const hi = arrayMax(cumulative);
    const scale = niceScale(Math.min(0, lo), Math.max(0, hi));
    const p = this.plotArea;
    this._drawGrid(scale);
    this._drawXLabels(data.map((d) => d.label), /*centered=*/ true);
    const groupW = p.w / n;
    const barW = groupW * 0.6;
    const t = this.animProgress;
    const range = scale.max - scale.min || 1;

    data.forEach((d, i) => {
      const prevCum = cumulative[i];
      const base = p.y + p.h - ((prevCum - scale.min) / range) * p.h;
      const curCum = cumulative[i + 1];
      const top = p.y + p.h - ((curCum - scale.min) / range) * p.h;
      const color = d.value >= 0 ? this.theme.positive : this.theme.negative;
      const isHover = i === this.hoverIndex;
      const h = (base - top) * t;
      const y = d.value >= 0 ? base - h : base;
      const x = p.x + i * groupW + (groupW - barW) / 2;
      const absH = Math.abs(h);
      roundedBar(this.ctx, x, y, barW, absH,
        isHover ? color : hexToRgba(color, 0.75),
        { radii: 3, hover: isHover, glowColor: color });
      if (i < n - 1) {
        const nextX = p.x + (i + 1) * groupW + (groupW - barW) / 2;
        this.ctx.strokeStyle = hexToRgba(this.theme.textMuted, 0.4);
        this.ctx.lineWidth = 1;
        this.ctx.setLineDash([3, 3]);
        this.ctx.beginPath();
        const connY = d.value >= 0 ? y : y + Math.abs(h);
        this.ctx.moveTo(x + barW, connY);
        this.ctx.lineTo(nextX, connY);
        this.ctx.stroke();
        this.ctx.setLineDash([]);
      }
    });
  }
}
