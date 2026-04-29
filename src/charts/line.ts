import type { LineChartConfig } from '../types';
import { BaseChart } from '../core/base';
import { niceScale, hexToRgba, clamp, arraysExtent } from '../utils/helpers';
import { lttbIndices, autoTarget } from '../perf/lttb';
import { visibleRange } from '../perf/viewport';

export class LineChart extends BaseChart {
  declare config: LineChartConfig & BaseChart['config'];

  // Read from `this.config` so prop updates propagate without recreation.
  private get _area(): boolean { return !!this.config.area; }
  private get _smooth(): boolean { return this.config.smooth !== false; }
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

    datasets.forEach((ds, si) => {
      const color = ds.color || this.theme.colors[si % this.theme.colors.length];

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
          this.ctx.beginPath();
          this.ctx.arc(pt.x, pt.y, isHover ? 5 : 3, 0, Math.PI * 2);
          this.ctx.fillStyle = isHover ? color : this.theme.bg;
          this.ctx.fill();
          this.ctx.strokeStyle = color;
          this.ctx.lineWidth = 2;
          this.ctx.stroke();
          if (isHover) {
            this.ctx.beginPath();
            this.ctx.arc(pt.x, pt.y, 10, 0, Math.PI * 2);
            this.ctx.fillStyle = hexToRgba(color, 0.15);
            this.ctx.fill();
          }
        });
      }

      this.ctx.restore();
    });
  }
}
