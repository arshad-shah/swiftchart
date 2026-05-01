import type { LineChartConfig } from '../types';
import { BaseChart } from '../core/base';
import { niceScale, hexToRgba, clamp, arraysExtent } from '../utils/helpers';
import { datumColor, seriesColor } from '../core/draw';
import { lttbIndices, autoTarget } from '../perf/lttb';
import { visibleRange } from '../perf/viewport';

/**
 * Canvas 2D line chart with optional area fill, dots, and Bezier smoothing.
 *
 * Use `area: true` for an area chart, or import the `<Area>` React component.
 * Pass any object array to `setData(data, mapping)`; the mapping picks which
 * fields are X (labels) and Y (one or more series).
 *
 * @example
 * ```ts
 * import { LineChart } from '@arshad-shah/swift-chart';
 *
 * const chart = new LineChart('#chart', {
 *   theme: 'midnight',
 *   smooth: true,
 *   dots: true,
 * });
 *
 * chart.setData(
 *   [
 *     { month: 'Jan', revenue: 420, target: 400 },
 *     { month: 'Feb', revenue: 510, target: 450 },
 *   ],
 *   { x: 'month', y: ['revenue', 'target'] },
 * );
 * ```
 *
 * @see {@link LineChartConfig} for the full option list.
 */
export class LineChart extends BaseChart {
  declare config: LineChartConfig & BaseChart['config'];

  // Read from `this.config` so prop updates propagate without recreation.
  private get _area(): boolean { return !!this.config.area; }
  private get _step(): false | 'before' | 'after' | 'middle' {
    const s = this.config.step;
    if (s === true) return 'after';
    if (s === 'before' || s === 'after' || s === 'middle') return s;
    return false;
  }
  private get _smooth(): boolean {
    if (this._step) return false;
    return this.config.smooth !== false;
  }
  private get _dots(): boolean { return this.config.dots !== false; }
  private get _lineWidth(): number { return this.config.lineWidth || 2.5; }

  /** Downsample threshold — auto if 0 */
  downsampleTarget = 0;

  constructor(container: HTMLElement | string, config: LineChartConfig = {}) {
    super(container, config);
  }

  _onMouse(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const p = this.plotArea;
    const n = this.resolved.labels.length;
    if (n === 0) return;
    const stepW = p.w / Math.max(1, n - 1);
    const idx = Math.round((mx - p.x) / stepW);
    this.hoverIndex = clamp(idx, 0, n - 1);

    if (this.tooltip) {
      const x = p.x + this.hoverIndex * stepW;
      this.tooltip.showStructured(x, p.y + p.h / 3, this._tooltipContent(this.hoverIndex));
    }
    this._draw();
  }

  _draw(): void {
    const { labels, datasets } = this.resolved;
    if (!labels.length) return;

    this._drawBg();
    this._drawTitle();

    const [minV, maxV] = arraysExtent(datasets.map(d => d.data));
    const scale = niceScale(minV, maxV);
    const p = this.plotArea;

    this._drawGrid(scale);
    this._drawXLabels(labels, /*centered=*/false);
    this._drawLegend();

    const n = labels.length;
    const stepW = p.w / Math.max(1, n - 1);
    const t = this.animProgress;
    const range = scale.max - scale.min || 1;

    if (this.hoverIndex >= 0) this._drawCrosshair(this.hoverIndex);

    const colorFn = this.config.colorFn;
    datasets.forEach((ds, si) => {
      // Stroke / area fill stay at the series level — a single line can't
      // change colour mid-segment in any clean way. `colorFn` and per-datum
      // overrides apply to the *dots* below, where it's well-defined.
      const color = seriesColor(this.theme, ds, si);

      // ── LTTB downsampling ───────────────────────────
      const target = this.downsampleTarget || autoTarget(ds.data.length, p.w);
      const indices = ds.data.length > target
        ? lttbIndices(ds.data, target)
        : null;

      const srcIndices = indices || Array.from({ length: ds.data.length }, (_, i) => i);
      const allPoints = srcIndices.map(i => ({
        x: p.x + i * stepW,
        y: p.y + p.h - ((ds.data[i] - scale.min) / range) * p.h,
        origIdx: i,
      }));

      // ── Viewport culling ────────────────────────────
      const screenXs = allPoints.map(pt => pt.x);
      const [vStart, vEnd] = visibleRange(screenXs, p.x, p.x + p.w * t);
      const points = allPoints.slice(vStart, vEnd + 1);

      if (points.length === 0) return;

      this.ctx.save();
      this.ctx.beginPath();
      this.ctx.rect(p.x, p.y - 10, p.w * t, p.h + 20);
      this.ctx.clip();

      this.ctx.strokeStyle = color;
      this.ctx.lineWidth = this._lineWidth;
      this.ctx.lineJoin = 'round';
      this.ctx.lineCap = 'round';
      this.ctx.beginPath();

      const stepMode = this._step;
      if (this._smooth && points.length > 2) {
        this.ctx.moveTo(points[0].x, points[0].y);
        for (let i = 0; i < points.length - 1; i++) {
          const p0 = points[Math.max(0, i - 1)];
          const p1 = points[i];
          const p2 = points[i + 1];
          const p3 = points[Math.min(points.length - 1, i + 2)];
          const cp1x = p1.x + (p2.x - p0.x) / 6;
          const cp1y = p1.y + (p2.y - p0.y) / 6;
          const cp2x = p2.x - (p3.x - p1.x) / 6;
          const cp2y = p2.y - (p3.y - p1.y) / 6;
          this.ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
        }
      } else if (stepMode) {
        this.ctx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
          const prev = points[i - 1];
          const cur = points[i];
          if (stepMode === 'before') {
            this.ctx.lineTo(prev.x, cur.y);
            this.ctx.lineTo(cur.x, cur.y);
          } else if (stepMode === 'middle') {
            const mx = (prev.x + cur.x) / 2;
            this.ctx.lineTo(mx, prev.y);
            this.ctx.lineTo(mx, cur.y);
            this.ctx.lineTo(cur.x, cur.y);
          } else {
            this.ctx.lineTo(cur.x, prev.y);
            this.ctx.lineTo(cur.x, cur.y);
          }
        }
      } else {
        points.forEach((pt, i) =>
          i === 0 ? this.ctx.moveTo(pt.x, pt.y) : this.ctx.lineTo(pt.x, pt.y)
        );
      }
      this.ctx.stroke();

      if (this._area) {
        const grad = this.ctx.createLinearGradient(0, p.y, 0, p.y + p.h);
        grad.addColorStop(0, hexToRgba(color, 0.25));
        grad.addColorStop(1, hexToRgba(color, 0.0));
        this.ctx.lineTo(points[points.length - 1].x, p.y + p.h);
        this.ctx.lineTo(points[0].x, p.y + p.h);
        this.ctx.closePath();
        this.ctx.fillStyle = grad;
        this.ctx.fill();
      }

      if (this._dots) {
        points.forEach((pt) => {
          const isHover = pt.origIdx === this.hoverIndex;
          // Dot ring matches the line, but the *fill* (and hover halo) use the
          // per-datum colour so consumers can highlight individual points.
          const dotColor = datumColor(this.theme, ds, si, pt.origIdx, colorFn);
          this.ctx.beginPath();
          this.ctx.arc(pt.x, pt.y, isHover ? 5 : 3, 0, Math.PI * 2);
          this.ctx.fillStyle = isHover ? dotColor : this.theme.bg;
          this.ctx.fill();
          this.ctx.strokeStyle = dotColor;
          this.ctx.lineWidth = 2;
          this.ctx.stroke();
          if (isHover) {
            this.ctx.beginPath();
            this.ctx.arc(pt.x, pt.y, 10, 0, Math.PI * 2);
            this.ctx.fillStyle = hexToRgba(dotColor, 0.15);
            this.ctx.fill();
          }
        });
      }

      this.ctx.restore();
    });
  }
}
