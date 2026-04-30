import type { GaugeConfig } from '../types';
import { BaseChart } from '../core/base';
import { hexToRgba, clamp, safeRadius } from '../utils/helpers';

/**
 * Canvas 2D gauge / meter with optional coloured threshold segments.
 *
 * Pass `[value]` to {@link BaseChart.setData} or set `value` in the config.
 *
 * @example
 * ```ts
 * import { GaugeChart } from '@arshad-shah/swift-chart';
 *
 * const chart = new GaugeChart('#chart', {
 *   min: 0, max: 100,
 *   segments: [
 *     { color: '#5b8cff', to: 60 },
 *     { color: '#ffa45b', to: 85 },
 *     { color: '#ff5b5b', to: 100 },
 *   ],
 * });
 * chart.setData([72]);
 * ```
 */
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
    this._segments.forEach((seg) => {
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
    const ticks = [this._min, ...this._segments.map((s) => s.to)];
    this.ctx.strokeStyle = hexToRgba(this.theme.text, 0.5);
    this.ctx.lineWidth = 1.5;
    ticks.forEach((v) => {
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

    // Needle base disk.
    const baseRadius = thick * 0.55;
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

    // Min / max labels just outside the arc.
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
