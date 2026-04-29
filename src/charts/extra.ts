import type {
  BaseChartConfig, GaugeConfig, DataMapping,
  ScatterGroups, WaterfallItem, TreemapItem, TreemapRect,
} from '../types';
import { BaseChart } from '../core/base';
import {
  niceScale, hexToRgba, clamp, arrayMin, arrayMax, arraysExtent,
  safeRadius, safeDim,
} from '../utils/helpers';
import { Quadtree } from '../perf/quadtree';

// ═══════════════════════════════════════════════════════
// Scatter (with Quadtree hover)
// ═══════════════════════════════════════════════════════
export class ScatterChart extends BaseChart {
  scatterData: ScatterGroups | null = null;
  private _qt: Quadtree | null = null;
  private _flatPts: { sx: number; sy: number; pt: any; gi: number; gName: string }[] = [];

  setData(data: Record<string, any>[] | null | undefined, mapping?: DataMapping): void {
    this._qt = null;
    this._flatPts = [];
    if (Array.isArray(data) && data.length) {
      const xKey = mapping?.x || 'x';
      const yKey = mapping?.y as string || 'y';
      const labelKey = mapping?.labelField || 'label';
      const sizeKey = mapping?.sizeField || 'size';
      const groupKey = mapping?.groupField || 'group';

      const groups: ScatterGroups = {};
      data.forEach(d => {
        const g = String(d[groupKey] || 'default');
        if (!groups[g]) groups[g] = [];
        groups[g].push({
          x: +d[xKey], y: +d[yKey],
          label: d[labelKey] || '', size: d[sizeKey] || 5,
        });
      });
      this.scatterData = groups;
      // Build the resolved.datasets array so the legend has labels.
      this.resolved = {
        labels: [],
        datasets: Object.keys(groups).map((g, i) => ({
          label: g,
          data: [],
          color: this.theme.colors[i % this.theme.colors.length],
        })),
      };
    } else {
      this.scatterData = null;
      this.resolved = { labels: [], datasets: [] };
    }
    this._animate();
  }

  private _buildQuadtree(): void {
    if (!this.scatterData) return;
    const p = this.plotArea;
    const xs: number[] = [];
    const ys: number[] = [];
    Object.values(this.scatterData).forEach(pts => {
      pts.forEach(pt => { xs.push(pt.x); ys.push(pt.y); });
    });
    if (!xs.length) return;
    const xScale = niceScale(arrayMin(xs), arrayMax(xs));
    const yScale = niceScale(arrayMin(ys), arrayMax(ys));
    const xRange = xScale.max - xScale.min || 1;
    const yRange = yScale.max - yScale.min || 1;

    this._qt = new Quadtree({ x: p.x, y: p.y, w: p.w, h: p.h });
    this._flatPts = [];
    let globalIdx = 0;
    Object.entries(this.scatterData).forEach(([gName, pts], gi) => {
      pts.forEach(pt => {
        const sx = p.x + ((pt.x - xScale.min) / xRange) * p.w;
        const sy = p.y + p.h - ((pt.y - yScale.min) / yRange) * p.h;
        this._qt!.insert({ sx, sy, index: globalIdx, group: gi });
        this._flatPts.push({ sx, sy, pt, gi, gName });
        globalIdx++;
      });
    });
  }

  _onMouse(e: MouseEvent): void {
    if (!this.scatterData) return;
    const rect = this.canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    if (!this._qt) this._buildQuadtree();

    if (this._qt) {
      const nearest = this._qt.nearest(mx, my, 20);
      this.hoverIndex = nearest ? nearest.index : -1;
    } else {
      this.hoverIndex = -1;
    }

    if (this.hoverIndex >= 0 && this.tooltip && this._flatPts[this.hoverIndex]) {
      const fp = this._flatPts[this.hoverIndex];
      const color = this.theme.colors[fp.gi % this.theme.colors.length];
      this.tooltip.showStructured(fp.sx, fp.sy, {
        title: fp.pt.label || fp.gName,
        rows: [
          { label: 'x', value: this._fmtVal(fp.pt.x), color },
          { label: 'y', value: this._fmtVal(fp.pt.y) },
        ],
      });
    } else this.tooltip?.hide();
    this._draw();
  }

  _draw(): void {
    if (!this.scatterData) return;
    this._drawBg();
    this._drawTitle();

    const xs: number[] = [];
    const ys: number[] = [];
    Object.values(this.scatterData).forEach(pts => {
      pts.forEach(pt => { xs.push(pt.x); ys.push(pt.y); });
    });
    if (!xs.length) return;

    const xScale = niceScale(arrayMin(xs), arrayMax(xs));
    const yScale = niceScale(arrayMin(ys), arrayMax(ys));
    const p = this.plotArea;
    const t = this.animProgress;
    const xRange = xScale.max - xScale.min || 1;
    const yRange = yScale.max - yScale.min || 1;

    this._drawGrid(yScale);
    this._drawLegend();
    const ff = this._fontFamily();
    const tickCount = Math.max(2, Math.round(xRange / xScale.step) + 1);
    for (let i = 0; i < tickCount; i++) {
      const v = xScale.min + i * xScale.step;
      const x = p.x + ((v - xScale.min) / xRange) * p.w;
      this.ctx.strokeStyle = this.theme.grid;
      this.ctx.beginPath(); this.ctx.moveTo(x, p.y); this.ctx.lineTo(x, p.y + p.h); this.ctx.stroke();
      this.ctx.fillStyle = this.theme.textMuted;
      this.ctx.font = `400 10px ${ff}`;
      this.ctx.textAlign = 'center';
      this.ctx.fillText(this._fmtVal(v), x, p.y + p.h + 14);
    }

    // Invalidate quadtree on draw — scales may have shifted.
    this._qt = null;

    let globalIdx = 0;
    Object.entries(this.scatterData).forEach(([, pts], gi) => {
      const color = this.theme.colors[gi % this.theme.colors.length];
      pts.forEach(pt => {
        const sx = p.x + ((pt.x - xScale.min) / xRange) * p.w;
        const sy = p.y + p.h - ((pt.y - yScale.min) / yRange) * p.h;
        const isHover = globalIdx === this.hoverIndex;
        const size = safeRadius((pt.size || 5) * t);
        this.ctx.beginPath();
        this.ctx.arc(sx, sy, safeRadius(isHover ? size + 2 : size), 0, Math.PI * 2);
        this.ctx.fillStyle = isHover ? color : hexToRgba(color, 0.7);
        if (isHover) { this.ctx.shadowColor = hexToRgba(color, 0.5); this.ctx.shadowBlur = 12; }
        this.ctx.fill();
        this.ctx.shadowBlur = 0;
        globalIdx++;
      });
    });
  }
}

// ═══════════════════════════════════════════════════════
// Radar
// ═══════════════════════════════════════════════════════
export class RadarChart extends BaseChart {
  constructor(container: HTMLElement | string, config: BaseChartConfig = {}) {
    super(container, { padding: { top: 30, right: 40, bottom: 20, left: 40 }, ...config });
  }

  _onMouse(_e: MouseEvent): void {
    // Radar doesn't need per-point hover for now
  }

  _draw(): void {
    const { labels, datasets } = this.resolved;
    if (!labels.length) return;
    this._drawBg();
    this._drawTitle();
    this._drawLegend();
    const p = this.plotArea;
    const cx = p.x + p.w / 2, cy = p.y + p.h / 2;
    const r = Math.min(p.w, p.h) / 2 - 20;
    if (r <= 0) return;
    const n = labels.length;
    const t = this.animProgress;
    const [, maxV] = arraysExtent(datasets.map(d => d.data));
    const maxVal = Math.max(maxV, 1);
    const levels = 5;
    const ff = this._fontFamily();
    for (let l = 1; l <= levels; l++) {
      const lr = (l / levels) * r;
      this.ctx.strokeStyle = this.theme.grid;
      this.ctx.lineWidth = 1;
      this.ctx.beginPath();
      for (let i = 0; i <= n; i++) {
        const angle = (i % n) * (Math.PI * 2 / n) - Math.PI / 2;
        const x = cx + Math.cos(angle) * lr, y = cy + Math.sin(angle) * lr;
        if (i === 0) this.ctx.moveTo(x, y); else this.ctx.lineTo(x, y);
      }
      this.ctx.stroke();
    }
    for (let i = 0; i < n; i++) {
      const angle = i * (Math.PI * 2 / n) - Math.PI / 2;
      const x = cx + Math.cos(angle) * r, y = cy + Math.sin(angle) * r;
      this.ctx.strokeStyle = this.theme.grid;
      this.ctx.beginPath(); this.ctx.moveTo(cx, cy); this.ctx.lineTo(x, y); this.ctx.stroke();
      const lx = cx + Math.cos(angle) * (r + 14), ly = cy + Math.sin(angle) * (r + 14);
      this.ctx.fillStyle = this.theme.textMuted;
      this.ctx.font = `400 10px ${ff}`;
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(labels[i], lx, ly);
    }
    datasets.forEach((ds, si) => {
      const color = ds.color || this.theme.colors[si % this.theme.colors.length];
      this.ctx.beginPath();
      ds.data.forEach((val, i) => {
        const angle = i * (Math.PI * 2 / n) - Math.PI / 2;
        const dr = (val / maxVal) * r * t;
        const x = cx + Math.cos(angle) * dr, y = cy + Math.sin(angle) * dr;
        if (i === 0) this.ctx.moveTo(x, y); else this.ctx.lineTo(x, y);
      });
      this.ctx.closePath();
      this.ctx.fillStyle = hexToRgba(color, 0.15);
      this.ctx.fill();
      this.ctx.strokeStyle = color;
      this.ctx.lineWidth = 2;
      this.ctx.stroke();
      ds.data.forEach((val, i) => {
        const angle = i * (Math.PI * 2 / n) - Math.PI / 2;
        const dr = (val / maxVal) * r * t;
        const x = cx + Math.cos(angle) * dr, y = cy + Math.sin(angle) * dr;
        this.ctx.beginPath();
        this.ctx.arc(x, y, 3.5, 0, Math.PI * 2);
        this.ctx.fillStyle = color;
        this.ctx.fill();
      });
    });
  }
}

// ═══════════════════════════════════════════════════════
// Gauge
// ═══════════════════════════════════════════════════════
export class GaugeChart extends BaseChart {
  declare config: GaugeConfig & BaseChart['config'];

  /** The current target value the needle is animating toward. */
  private _value: number;
  /** Where the needle is animating from (smooth real-time updates). */
  private _fromValue: number;
  /** Last computed displayed value — used as the new "from" on subsequent updates. */
  private _displayedValue: number;

  // Read config props each draw so changes via chart.update() take effect.
  private get _min(): number { return this.config.min ?? 0; }
  private get _max(): number { return this.config.max ?? 100; }
  private get _segments(): { color: string; to: number }[] {
    if (this.config.segments && this.config.segments.length) return this.config.segments;
    const lo = this._min, hi = this._max;
    return [
      { color: this.theme.positive, to: lo + (hi - lo) * 0.33 },
      { color: '#facc15',           to: lo + (hi - lo) * 0.66 },
      { color: this.theme.negative, to: hi },
    ];
  }

  constructor(container: HTMLElement | string, config: GaugeConfig = {}) {
    super(container, {
      padding: { top: 20, right: 20, bottom: 20, left: 20 },
      showGrid: false, showLegend: false,
      ...config,
    });
    this._value = config.value ?? 0;
    this._fromValue = this._min;
    this._displayedValue = this._min;
  }

  /**
   * Smoothly transition the needle to `val`.
   * Animation interpolates from the *currently displayed* value, so streams of
   * setValue() calls produce a continuous needle motion instead of restarting.
   */
  setValue(val: number): void {
    this._fromValue = this._displayedValue;
    this._value = val;
    this._animate();
  }

  _onMouse(_e: MouseEvent): void {}

  _draw(): void {
    this._drawBg();
    this._drawTitle();

    const p = this.plotArea;
    const cx = p.x + p.w / 2;
    const cy = p.y + p.h * 0.62;
    const r = safeRadius(Math.min(p.w / 2, p.h * 0.55));
    if (r <= 0) return;
    const thick = safeRadius(r * 0.20);
    const startA = Math.PI * 0.78;
    const endA = Math.PI * 2.22;
    const totalA = endA - startA;
    const t = this.animProgress;
    const ff = this._fontFamily();
    const range = this._max - this._min || 1;

    // Track (background arc).
    this.ctx.strokeStyle = hexToRgba(this.theme.grid, 0.5);
    this.ctx.lineWidth = thick;
    this.ctx.lineCap = 'round';
    this.ctx.beginPath();
    this.ctx.arc(cx, cy, r, startA, endA);
    this.ctx.stroke();

    // Segment fill (subtle, behind the value arc).
    let prevTo = this._min;
    this._segments.forEach(seg => {
      const sStart = startA + ((prevTo - this._min) / range) * totalA;
      const sEnd = startA + ((seg.to - this._min) / range) * totalA;
      this.ctx.strokeStyle = hexToRgba(seg.color, 0.22);
      this.ctx.lineWidth = thick;
      this.ctx.lineCap = 'butt';
      this.ctx.beginPath();
      this.ctx.arc(cx, cy, r, sStart, sEnd);
      this.ctx.stroke();
      prevTo = seg.to;
    });

    // Tick marks at each segment boundary plus min and max.
    const tickInner = r - thick * 0.55;
    const tickOuter = r + thick * 0.55;
    const ticks = [this._min, ...this._segments.map(s => s.to)];
    this.ctx.strokeStyle = hexToRgba(this.theme.text, 0.5);
    this.ctx.lineWidth = 1.5;
    ticks.forEach(v => {
      const a = startA + ((v - this._min) / range) * totalA;
      this.ctx.beginPath();
      this.ctx.moveTo(cx + Math.cos(a) * tickInner, cy + Math.sin(a) * tickInner);
      this.ctx.lineTo(cx + Math.cos(a) * tickOuter, cy + Math.sin(a) * tickOuter);
      this.ctx.stroke();
    });

    // Interpolate displayed value between previous and target.
    const displayed = this._fromValue + (this._value - this._fromValue) * t;
    this._displayedValue = displayed;
    const clamped = clamp(displayed, this._min, this._max);
    const valAngle = startA + ((clamped - this._min) / range) * totalA;

    // Pick the colour of the *current* segment.
    let valColor = this._segments[this._segments.length - 1].color;
    for (const seg of this._segments) {
      if (displayed <= seg.to) { valColor = seg.color; break; }
    }

    // Filled value arc.
    this.ctx.strokeStyle = valColor;
    this.ctx.lineWidth = thick;
    this.ctx.lineCap = 'round';
    this.ctx.beginPath();
    this.ctx.arc(cx, cy, r, startA, valAngle);
    this.ctx.stroke();

    // Soft glow at the head of the value arc.
    const headX = cx + Math.cos(valAngle) * r;
    const headY = cy + Math.sin(valAngle) * r;
    this.ctx.fillStyle = hexToRgba(valColor, 0.3);
    this.ctx.beginPath();
    this.ctx.arc(headX, headY, thick * 0.8, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.fillStyle = valColor;
    this.ctx.beginPath();
    this.ctx.arc(headX, headY, thick * 0.36, 0, Math.PI * 2);
    this.ctx.fill();

    // Needle (slim taper from a shielded base disk).
    const baseRadius = thick * 0.55;
    // Base disk first so the needle sits on top.
    this.ctx.fillStyle = this.theme.bg;
    this.ctx.beginPath();
    this.ctx.arc(cx, cy, baseRadius + 3, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.fillStyle = hexToRgba(this.theme.text, 0.9);
    this.ctx.beginPath();
    this.ctx.arc(cx, cy, baseRadius, 0, Math.PI * 2);
    this.ctx.fill();

    // Needle line.
    const nLen = r - thick * 0.2;
    const nx = cx + Math.cos(valAngle) * nLen;
    const ny = cy + Math.sin(valAngle) * nLen;
    this.ctx.strokeStyle = this.theme.text;
    this.ctx.lineWidth = 2.5;
    this.ctx.lineCap = 'round';
    this.ctx.beginPath();
    this.ctx.moveTo(cx, cy);
    this.ctx.lineTo(nx, ny);
    this.ctx.stroke();

    // Min / max labels just outside the arc, vertically aligned with track ends.
    const labelInset = thick * 1.4;
    this.ctx.fillStyle = this.theme.textMuted;
    this.ctx.font = `500 11px ${ff}`;
    this.ctx.textBaseline = 'top';

    const minA = startA;
    const maxA = endA;
    const minX = cx + Math.cos(minA) * (r + labelInset * 0.2);
    const minY = cy + Math.sin(minA) * (r + labelInset * 0.2) + thick * 0.55;
    const maxX = cx + Math.cos(maxA) * (r + labelInset * 0.2);
    const maxY = cy + Math.sin(maxA) * (r + labelInset * 0.2) + thick * 0.55;

    this.ctx.textAlign = 'center';
    this.ctx.fillText(this._fmtVal(this._min), minX, minY);
    this.ctx.fillText(this._fmtVal(this._max), maxX, maxY);

    // Big value read-out at centre-bottom.
    const readoutY = cy + r * 0.55;
    this.ctx.fillStyle = this.theme.text;
    this.ctx.font = `700 ${Math.max(20, r * 0.35).toFixed(0)}px ${ff}`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'alphabetic';
    this.ctx.fillText(this._fmtVal(Math.round(displayed)), cx, readoutY);

    // Subtle subtitle below value.
    this.ctx.fillStyle = this.theme.textMuted;
    this.ctx.font = `400 11px ${ff}`;
    this.ctx.fillText(
      this.config.subtitle || `${this._fmtVal(this._min)}–${this._fmtVal(this._max)}`,
      cx, readoutY + 14,
    );
  }
}

// ═══════════════════════════════════════════════════════
// Horizontal Bar
// ═══════════════════════════════════════════════════════
export class HBarChart extends BaseChart {
  constructor(container: HTMLElement | string, config: BaseChartConfig = {}) {
    super(container, { padding: { top: 30, right: 20, bottom: 20, left: 90 }, ...config });
  }

  _onMouse(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const my = e.clientY - rect.top;
    const p = this.plotArea;
    const n = this.resolved.labels.length;
    if (!n) return;
    const slot = p.h / n;
    const idx = Math.floor((my - p.y) / slot);
    this.hoverIndex = idx >= 0 && idx < n ? idx : -1;
    if (this.hoverIndex >= 0 && this.tooltip) {
      this.tooltip.showStructured(
        p.x + p.w / 2, p.y + (idx + 0.5) * slot,
        this._tooltipContent(this.hoverIndex),
      );
    }
    this._draw();
  }

  _draw(): void {
    const { labels, datasets } = this.resolved;
    if (!labels.length) return;
    this._drawBg();
    this._drawTitle();
    this._drawLegend();
    const [, maxV] = arraysExtent(datasets.map(d => d.data));
    const maxVal = Math.max(maxV, 1);
    const p = this.plotArea;
    const n = labels.length;
    const slot = p.h / n;
    const barH = slot * 0.6;
    const gap = slot * 0.4;
    const t = this.animProgress;
    const ff = this._fontFamily();

    labels.forEach((label, i) => {
      this.ctx.fillStyle = i === this.hoverIndex ? this.theme.text : this.theme.textMuted;
      this.ctx.font = `400 11px ${ff}`;
      this.ctx.textAlign = 'right';
      this.ctx.textBaseline = 'middle';
      const yCenter = p.y + i * slot + slot / 2;
      const display = String(label).length > 12 ? String(label).slice(0, 11) + '…' : String(label);
      this.ctx.fillText(display, p.x - 8, yCenter);

      datasets.forEach((ds, si) => {
        const color = ds.color || this.theme.colors[si % this.theme.colors.length];
        const val = ds.data[i];
        const w = (val / maxVal) * p.w * t;
        const y = p.y + i * slot + gap / 2;
        const isHover = i === this.hoverIndex;

        this.ctx.fillStyle = isHover ? color : hexToRgba(color, 0.75);
        if (isHover) { this.ctx.shadowColor = hexToRgba(color, 0.3); this.ctx.shadowBlur = 10; }
        const r = safeRadius(Math.min(4, barH / 2));
        this.ctx.beginPath();
        this.ctx.moveTo(p.x, y);
        this.ctx.lineTo(p.x + w - r, y);
        this.ctx.quadraticCurveTo(p.x + w, y, p.x + w, y + r);
        this.ctx.lineTo(p.x + w, y + barH - r);
        this.ctx.quadraticCurveTo(p.x + w, y + barH, p.x + w - r, y + barH);
        this.ctx.lineTo(p.x, y + barH);
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.shadowBlur = 0;

        if (w > 40) {
          this.ctx.fillStyle = this.theme.onAccent;
          this.ctx.font = `500 10px ${ff}`;
          this.ctx.textAlign = 'right';
          this.ctx.textBaseline = 'middle';
          this.ctx.fillText(this._fmtVal(val), p.x + w - 8, yCenter);
        }
      });
    });
  }
}

// ═══════════════════════════════════════════════════════
// Sparkline
// ═══════════════════════════════════════════════════════
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
      ? values.map(v => typeof v === 'number' ? v : 0)
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
    points.forEach((pt, i) => i === 0 ? this.ctx.moveTo(pt.x, pt.y) : this.ctx.lineTo(pt.x, pt.y));
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

// ═══════════════════════════════════════════════════════
// Stacked Area
// ═══════════════════════════════════════════════════════
export class StackedAreaChart extends BaseChart {
  _onMouse(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const p = this.plotArea;
    const n = this.resolved.labels.length;
    if (!n) return;
    const stepW = p.w / Math.max(1, n - 1);
    const idx = Math.round((mx - p.x) / stepW);
    this.hoverIndex = clamp(idx, 0, n - 1);
    if (this.tooltip) {
      const x = p.x + this.hoverIndex * stepW;
      const total = this.resolved.datasets.reduce((a, ds) => a + (ds.data[this.hoverIndex] ?? 0), 0);
      const rows = this.resolved.datasets.map((ds, i) => {
        const color = ds.color || this.theme.colors[i % this.theme.colors.length];
        return {
          label: ds.label || `Series ${i + 1}`,
          value: this._fmtVal(ds.data[this.hoverIndex]),
          color,
        };
      });
      this.tooltip.showStructured(x, p.y + p.h / 3, {
        title: this.resolved.labels[this.hoverIndex],
        rows,
        footer: `Total: ${this._fmtVal(total)}`,
      });
    }
    this._draw();
  }

  _draw(): void {
    const { labels, datasets } = this.resolved;
    if (!labels.length) return;
    this._drawBg();
    this._drawTitle();
    this._drawLegend();
    const n = labels.length;
    const stacked = datasets.map(ds => [...ds.data]);
    for (let si = 1; si < stacked.length; si++) {
      for (let i = 0; i < n; i++) stacked[si][i] += stacked[si - 1][i];
    }
    const top = stacked[stacked.length - 1] || [];
    const maxVal = arrayMax(top);
    const scale = niceScale(0, Math.max(maxVal, 1));
    const p = this.plotArea;
    const stepW = p.w / Math.max(1, n - 1);
    const t = this.animProgress;
    const range = scale.max - scale.min || 1;
    this._drawGrid(scale);
    this._drawXLabels(labels, /*centered=*/false);
    if (this.hoverIndex >= 0) this._drawCrosshair(this.hoverIndex);

    for (let si = stacked.length - 1; si >= 0; si--) {
      const color = datasets[si].color || this.theme.colors[si % this.theme.colors.length];
      const topPts = stacked[si].map((v, i) => ({
        x: p.x + i * stepW,
        y: p.y + p.h - ((v - scale.min) / range) * p.h * t,
      }));
      const bottomPts = si > 0
        ? stacked[si - 1].map((v, i) => ({
            x: p.x + i * stepW,
            y: p.y + p.h - ((v - scale.min) / range) * p.h * t,
          }))
        : topPts.map(pt => ({ x: pt.x, y: p.y + p.h }));

      this.ctx.beginPath();
      topPts.forEach((pt, i) => i === 0 ? this.ctx.moveTo(pt.x, pt.y) : this.ctx.lineTo(pt.x, pt.y));
      for (let i = bottomPts.length - 1; i >= 0; i--) this.ctx.lineTo(bottomPts[i].x, bottomPts[i].y);
      this.ctx.closePath();
      this.ctx.fillStyle = hexToRgba(color, 0.6);
      this.ctx.fill();
      this.ctx.strokeStyle = color;
      this.ctx.lineWidth = 1.5;
      this.ctx.beginPath();
      topPts.forEach((pt, i) => i === 0 ? this.ctx.moveTo(pt.x, pt.y) : this.ctx.lineTo(pt.x, pt.y));
      this.ctx.stroke();
    }
  }
}

// ═══════════════════════════════════════════════════════
// Waterfall
// ═══════════════════════════════════════════════════════
export class WaterfallChart extends BaseChart {
  private _wfData: WaterfallItem[] = [];

  setData(data: Record<string, any>[] | null | undefined, mapping?: DataMapping): void {
    const labelKey = mapping?.labelField || 'label';
    const valKey = mapping?.valueField || 'value';
    this._wfData = (data || []).map(d => ({ label: String(d[labelKey]), value: +d[valKey] }));
    this._animate();
  }

  _onMouse(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const p = this.plotArea;
    const n = this._wfData.length;
    if (!n) return;
    const barW = p.w / n;
    const idx = Math.floor((mx - p.x) / barW);
    this.hoverIndex = idx >= 0 && idx < n ? idx : -1;
    if (this.hoverIndex >= 0 && this.tooltip) {
      const d = this._wfData[this.hoverIndex];
      let cumulative = 0;
      for (let i = 0; i <= this.hoverIndex; i++) cumulative += this._wfData[i].value;
      const sign = d.value >= 0 ? '+' : '';
      const color = d.value >= 0 ? this.theme.positive : this.theme.negative;
      this.tooltip.showStructured(p.x + (idx + 0.5) * barW, p.y + p.h / 2, {
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
    this._drawXLabels(data.map(d => d.label), /*centered=*/true);
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
      this.ctx.fillStyle = isHover ? color : hexToRgba(color, 0.75);
      if (isHover) { this.ctx.shadowColor = hexToRgba(color, 0.3); this.ctx.shadowBlur = 10; }
      const x = p.x + i * groupW + (groupW - barW) / 2;
      const absH = Math.abs(h);
      const r = safeRadius(Math.min(3, barW / 2, absH / 2));
      this.ctx.beginPath();
      this.ctx.roundRect(x, y, safeDim(barW), safeDim(absH), r);
      this.ctx.fill();
      this.ctx.shadowBlur = 0;
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

// ═══════════════════════════════════════════════════════
// Treemap
// ═══════════════════════════════════════════════════════
export class TreemapChart extends BaseChart {
  private _items: TreemapItem[] = [];
  private _rects: TreemapRect[] = [];

  constructor(container: HTMLElement | string, config: BaseChartConfig = {}) {
    super(container, {
      padding: { top: 30, right: 10, bottom: 10, left: 10 },
      showGrid: false, showLegend: false,
      ...config,
    });
  }

  setData(data: Record<string, any>[] | null | undefined, mapping?: DataMapping): void {
    const labelKey = mapping?.labelField || 'name';
    const valKey = mapping?.valueField || 'value';
    this._items = (data || [])
      .map(d => ({ label: String(d[labelKey]), value: +d[valKey] || 0 }))
      .filter(d => d.value > 0)
      .sort((a, b) => b.value - a.value);
    this._animate();
  }

  _onMouse(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    this.hoverIndex = -1;
    this._rects.forEach((r, i) => {
      if (mx >= r.rx && mx <= r.rx + r.rw && my >= r.ry && my <= r.ry + r.rh) this.hoverIndex = i;
    });
    if (this.hoverIndex >= 0 && this.tooltip) {
      const r = this._rects[this.hoverIndex];
      const total = this._items.reduce((a, b) => a + b.value, 0) || 1;
      const pct = ((r.value / total) * 100).toFixed(1);
      const color = this.theme.colors[this.hoverIndex % this.theme.colors.length];
      this.tooltip.showStructured(mx, my, {
        title: r.label,
        rows: [{ label: 'Value', value: `${this._fmtVal(r.value)} (${pct}%)`, color }],
      });
    } else this.tooltip?.hide();
    this._draw();
  }

  private _squarify(
    items: TreemapItem[],
    rect: { x: number; y: number; w: number; h: number },
  ): TreemapRect[] {
    if (!items.length) return [];
    const rects: TreemapRect[] = [];
    let remaining = [...items];
    let { x, y, w, h } = rect;

    while (remaining.length) {
      // Total is the *remaining* sum — squarify recurses into the leftover
      // sub-rectangle, so each step normalises against what's left.
      const remainingTotal = remaining.reduce((a, b) => a + b.value, 0);
      if (remainingTotal <= 0) break;

      const isWide = w >= h;
      const side = Math.max(0.0001, isWide ? h : w);
      const row = [remaining[0]];
      let rowSum = remaining[0].value;

      for (let i = 1; i < remaining.length; i++) {
        const testRow = [...row, remaining[i]];
        const testSum = rowSum + remaining[i].value;
        const worstCurrent = this._worst(row, rowSum, side, remainingTotal);
        const worstTest = this._worst(testRow, testSum, side, remainingTotal);
        if (worstTest < worstCurrent) {
          row.push(remaining[i]);
          rowSum = testSum;
        } else break;
      }

      const rowFrac = rowSum / remainingTotal;
      const rowSize = isWide ? w * rowFrac : h * rowFrac;
      let offset = 0;

      row.forEach(item => {
        const itemFrac = item.value / rowSum;
        const itemSize = side * itemFrac;
        if (isWide) {
          rects.push({ ...item, rx: x, ry: y + offset, rw: rowSize, rh: itemSize });
        } else {
          rects.push({ ...item, rx: x + offset, ry: y, rw: itemSize, rh: rowSize });
        }
        offset += itemSize;
      });

      remaining = remaining.slice(row.length);
      if (isWide) { x += rowSize; w -= rowSize; }
      else { y += rowSize; h -= rowSize; }
    }
    return rects;
  }

  private _worst(row: TreemapItem[], rowSum: number, side: number, total: number): number {
    if (total === 0 || rowSum === 0) return Infinity;
    const s2 = (side * rowSum / total) ** 2;
    let maxR = 0;
    row.forEach(item => {
      const frac = side * (item.value / total);
      if (frac === 0 || s2 === 0) return;
      const r = Math.max(s2 / (frac * frac), (frac * frac) / s2);
      maxR = Math.max(maxR, r);
    });
    return maxR;
  }

  _draw(): void {
    if (!this._items.length) return;
    this._drawBg();
    this._drawTitle();
    const p = this.plotArea;
    if (p.w <= 0 || p.h <= 0) return;
    this._rects = this._squarify(this._items, { x: p.x, y: p.y, w: p.w, h: p.h });
    const t = this.animProgress;
    const ff = this._fontFamily();

    this._rects.forEach((r, i) => {
      const color = this.theme.colors[i % this.theme.colors.length];
      const isHover = i === this.hoverIndex;
      const pad = 1.5;
      this.ctx.fillStyle = isHover ? color : hexToRgba(color, 0.75);
      if (isHover) { this.ctx.shadowColor = hexToRgba(color, 0.4); this.ctx.shadowBlur = 12; }
      const animW = safeDim(r.rw * t), animH = safeDim(r.rh * t);
      const drawW = safeDim(animW - pad * 2);
      const drawH = safeDim(animH - pad * 2);
      const cr = safeRadius(Math.min(4, drawW / 2, drawH / 2));
      this.ctx.beginPath();
      this.ctx.roundRect(r.rx + pad, r.ry + pad, drawW, drawH, cr);
      this.ctx.fill();
      this.ctx.shadowBlur = 0;

      if (r.rw > 40 && r.rh > 24 && t > 0.5) {
        this.ctx.fillStyle = this.theme.onAccent;
        this.ctx.font = `500 ${Math.min(12, r.rw / 8)}px ${ff}`;
        this.ctx.textAlign = 'left';
        this.ctx.textBaseline = 'top';
        const maxChars = Math.floor(r.rw / 7);
        const display = r.label.length > maxChars ? r.label.slice(0, maxChars - 1) + '…' : r.label;
        this.ctx.globalAlpha = (t - 0.5) * 2;
        this.ctx.fillText(display, r.rx + 6, r.ry + 6);
        if (r.rh > 38) {
          this.ctx.font = `400 ${Math.min(10, r.rw / 10)}px ${ff}`;
          this.ctx.fillStyle = hexToRgba(this.theme.onAccent, 0.6);
          this.ctx.fillText(this._fmtVal(r.value), r.rx + 6, r.ry + 22);
        }
        this.ctx.globalAlpha = 1;
      }
    });
  }
}
