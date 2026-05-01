import type { BaseChartConfig, DataMapping, TreemapItem, TreemapRect } from '../types';
import { BaseChart } from '../core/base';
import { hexToRgba, safeDim, isColorString, hashStr } from '../utils/helpers';
import { roundedBar, datumColor } from '../core/draw';
import { squarify } from '../perf/layout/squarify';

/**
 * Canvas 2D squarified treemap. Layout work is delegated to the shared
 * {@link squarify} helper, which keeps this class focused on drawing and
 * hover handling.
 *
 * @example
 * ```ts
 * import { TreemapChart } from '@arshad-shah/swift-chart';
 *
 * const chart = new TreemapChart('#chart', { theme: 'midnight' });
 * chart.setData([
 *   { label: 'Compute', value: 42 },
 *   { label: 'Storage', value: 28 },
 *   { label: 'Network', value: 18 },
 * ]);
 * ```
 */
export class TreemapChart extends BaseChart {
  private _items: TreemapItem[] = [];
  private _rects: TreemapRect[] = [];
  /** Per-item colour overrides resolved at setData time (parallel to `_items`). */
  private _itemColors: (string | undefined)[] | undefined;

  constructor(container: HTMLElement | string, config: BaseChartConfig = {}) {
    super(container, {
      padding: { top: 30, right: 10, bottom: 10, left: 10 },
      showGrid: false, showLegend: false,
      ...config,
    });
  }

  setData(data: Record<string, any>[] | null | undefined, mapping?: DataMapping): void {
    // Backward-compatible default: support `name` *or* `label` as the label key.
    const labelKey = mapping?.labelField
      || (data && data[0] && 'label' in data[0] ? 'label' : 'name');
    const valKey = mapping?.valueField || 'value';
    const cf = mapping?.colorField;
    const cm = mapping?.colorMap;
    const palette = this.theme.colors;

    const enriched = (data || [])
      .map((d) => ({
        label: String(d[labelKey]),
        value: +d[valKey] || 0,
        _color: cf ? (() => {
          const raw = d[cf];
          if (raw == null) return undefined;
          const s = String(raw);
          if (isColorString(s)) return s;
          if (cm && cm[s]) return cm[s];
          return palette.length ? palette[hashStr(s) % palette.length] : undefined;
        })() : undefined,
      }))
      .filter((d) => d.value > 0)
      .sort((a, b) => b.value - a.value);

    this._items = enriched.map(({ label, value }) => ({ label, value }));
    this._itemColors = cf ? enriched.map(d => d._color) : undefined;
    this._animate();
  }

  _onMouse(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    this.hoverIndex = -1;
    this._rects.forEach((r, i) => {
      if (mx >= r.rx && mx <= r.rx + r.rw && my >= r.ry && my <= r.ry + r.rh) this.hoverIndex = i;
    });
    if (this.hoverIndex >= 0 && this.tooltip) {
      const r = this._rects[this.hoverIndex];
      const total = this._items.reduce((a, b) => a + b.value, 0) || 1;
      const pct = ((r.value / total) * 100).toFixed(1);
      const color = this._datumColor(this.hoverIndex);
      this.tooltip.showStructured(mx, my, {
        title: r.label,
        rows: [{ label: 'Value', value: `${this._fmtVal(r.value)} (${pct}%)`, color }],
      });
    } else this.tooltip?.hide();
    this._draw();
  }

  /**
   * Layered colour resolution for a single tile. Mirrors the cartesian-chart
   * resolver: `colorFn` → per-item colour from `colorField` → palette index.
   */
  private _datumColor(i: number): string {
    const fn = this.config.colorFn;
    if (fn) {
      const c = fn(this._items[i]?.value ?? 0, i, 0);
      if (c) return c;
    }
    const c = this._itemColors?.[i];
    if (c) return c;
    return datumColor(this.theme, undefined, i, 0);
  }

  _draw(): void {
    if (!this._items.length) return;
    this._drawBg();
    this._drawTitle();
    const p = this.plotArea;
    if (p.w <= 0 || p.h <= 0) return;
    this._rects = squarify(this._items, { x: p.x, y: p.y, w: p.w, h: p.h });
    const t = this.animProgress;
    const ff = this._fontFamily();

    this._rects.forEach((r, i) => {
      const color = this._datumColor(i);
      const isHover = i === this.hoverIndex;
      const pad = 1.5;
      const animW = safeDim(r.rw * t), animH = safeDim(r.rh * t);
      const drawW = safeDim(animW - pad * 2);
      const drawH = safeDim(animH - pad * 2);
      roundedBar(this.ctx, r.rx + pad, r.ry + pad, drawW, drawH,
        isHover ? color : hexToRgba(color, 0.75),
        { radii: 4, hover: isHover, glowColor: color });

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
