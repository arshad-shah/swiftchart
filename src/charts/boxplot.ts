import type { BoxplotChartConfig, BoxplotItem, DataMapping } from '../types';
import { BaseChart } from '../core/base';
import { niceScale, hexToRgba, safeDim } from '../utils/helpers';
import { fiveNumberSummary } from '../perf/layout/boxplot';

type ResolvedBox = BoxplotItem;

/**
 * Boxplot / box-and-whisker chart.
 *
 * Two input shapes are accepted:
 * - **Pre-computed:** rows with `min`, `q1`, `median`, `q3`, `max`, optional `outliers`.
 * - **Raw samples:** `mapping.y = 'samples'` where each row's value is `number[]`.
 *
 * @example
 * ```ts
 * new BoxplotChart('#chart').setData([
 *   { label: 'A', min: 5, q1: 12, median: 18, q3: 24, max: 31 },
 *   { label: 'B', min: 8, q1: 14, median: 22, q3: 28, max: 36, outliers: [42] },
 * ]);
 * ```
 */
export class BoxplotChart extends BaseChart {
  declare config: BoxplotChartConfig & BaseChart['config'];

  private _items: ResolvedBox[] = [];

  setData(data: Record<string, any>[] | null | undefined, mapping?: DataMapping): void {
    const labelKey = mapping?.labelField ?? mapping?.x ?? 'label';
    const samplesKey = (typeof mapping?.y === 'string' ? mapping.y : null) ?? 'samples';
    this._items = (data || []).map((d) => {
      // Pre-computed shape.
      if (d.median != null && d.q1 != null && d.q3 != null) {
        return {
          label: String(d[labelKey] ?? ''),
          min: +d.min, q1: +d.q1, median: +d.median, q3: +d.q3, max: +d.max,
          outliers: Array.isArray(d.outliers) ? d.outliers.map(Number) : [],
        };
      }
      // Raw samples shape.
      const samples: number[] = Array.isArray(d[samplesKey]) ? d[samplesKey] : [];
      const s = fiveNumberSummary(samples);
      return { label: String(d[labelKey] ?? ''), ...s };
    });
    this.resolved = { labels: this._items.map((d) => d.label), datasets: [] };
    this._animate();
  }

  _onMouse(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const p = this.plotArea;
    const n = this._items.length;
    if (!n) return;
    const slot = p.w / n;
    const idx = Math.floor((mx - p.x) / slot);
    this.hoverIndex = idx >= 0 && idx < n ? idx : -1;
    if (this.hoverIndex >= 0 && this.tooltip) {
      const d = this._items[this.hoverIndex];
      this.tooltip.showStructured(p.x + (idx + 0.5) * slot, p.y + p.h / 2, {
        title: d.label,
        rows: [
          { label: 'max',    value: this._fmtVal(d.max) },
          { label: 'q3',     value: this._fmtVal(d.q3) },
          { label: 'median', value: this._fmtVal(d.median), color: this.theme.colors[0] },
          { label: 'q1',     value: this._fmtVal(d.q1) },
          { label: 'min',    value: this._fmtVal(d.min) },
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
      if (d.min < lo) lo = d.min;
      if (d.max > hi) hi = d.max;
      if (d.outliers) for (const o of d.outliers) {
        if (o < lo) lo = o;
        if (o > hi) hi = o;
      }
    }
    const scale = niceScale(lo, hi);
    const p = this.plotArea;
    this._drawGrid(scale);
    this._drawXLabels(this._items.map((d) => d.label), /*centered=*/ true);

    const n = this._items.length;
    const slot = p.w / n;
    const boxW = Math.max(4, Math.min(slot * 0.55, 36));
    const range = scale.max - scale.min || 1;
    const t = this.animProgress;
    const showOutliers = this.config.showOutliers !== false;
    const yFor = (v: number) => p.y + p.h - ((v - scale.min) / range) * p.h * t;

    for (let i = 0; i < n; i++) {
      const d = this._items[i];
      const cx = p.x + (i + 0.5) * slot;
      const color = this.theme.colors[i % this.theme.colors.length];
      const isHover = i === this.hoverIndex;

      const yMax = yFor(d.max);
      const yMin = yFor(d.min);
      const yQ1 = yFor(d.q1);
      const yQ3 = yFor(d.q3);
      const yMed = yFor(d.median);

      // Whisker line.
      this.ctx.strokeStyle = hexToRgba(color, 0.85);
      this.ctx.lineWidth = 1.2;
      this.ctx.beginPath();
      this.ctx.moveTo(cx, yMax);
      this.ctx.lineTo(cx, yMin);
      this.ctx.stroke();

      // Whisker caps.
      this.ctx.beginPath();
      this.ctx.moveTo(cx - boxW / 4, yMax); this.ctx.lineTo(cx + boxW / 4, yMax);
      this.ctx.moveTo(cx - boxW / 4, yMin); this.ctx.lineTo(cx + boxW / 4, yMin);
      this.ctx.stroke();

      // Box (Q1 → Q3).
      this.ctx.fillStyle = hexToRgba(color, isHover ? 0.45 : 0.28);
      this.ctx.strokeStyle = color;
      this.ctx.lineWidth = isHover ? 2 : 1.2;
      const boxTop = Math.min(yQ1, yQ3);
      const boxH = safeDim(Math.abs(yQ1 - yQ3));
      this.ctx.fillRect(cx - boxW / 2, boxTop, boxW, boxH);
      this.ctx.strokeRect(cx - boxW / 2, boxTop, boxW, boxH);

      // Median.
      this.ctx.strokeStyle = color;
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.moveTo(cx - boxW / 2, yMed);
      this.ctx.lineTo(cx + boxW / 2, yMed);
      this.ctx.stroke();

      // Outliers.
      if (showOutliers && d.outliers) {
        for (const o of d.outliers) {
          this.ctx.beginPath();
          this.ctx.arc(cx, yFor(o), 2.5, 0, Math.PI * 2);
          this.ctx.fillStyle = hexToRgba(color, 0.8);
          this.ctx.fill();
        }
      }
    }
  }
}
