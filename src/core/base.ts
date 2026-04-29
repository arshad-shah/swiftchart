import type {
  BaseChartConfig,
  Theme,
  Padding,
  PlotArea,
  ResolvedData,
  DataMapping,
  NiceScale,
  EasingName,
} from '../types';
import { resolveTheme } from './themes';
import { Animator } from './animator';
import { Tooltip, type TooltipContent } from './tooltip';
import { dpr, resolveData, shortNum, hexToRgba } from '../utils/helpers';

const DEFAULT_PADDING: Padding = { top: 30, right: 20, bottom: 40, left: 55 };
const SSR = typeof document === 'undefined';
const LEGEND_AXIS_THICKNESS = 28;
const TITLE_HEIGHT = 32;

export abstract class BaseChart {
  container: HTMLElement;
  config: Required<
    Pick<
      BaseChartConfig,
      'animate' | 'animDuration' | 'animEasing' | 'responsive' |
      'showGrid' | 'showTooltip' | 'showLegend' | 'legendPosition' |
      'title' | 'subtitle'
    >
  > & BaseChartConfig;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  theme: Theme;
  animator: Animator;
  tooltip: Tooltip | null;
  hoverIndex = -1;
  animProgress = 1;
  resolved: ResolvedData = { labels: [], datasets: [] };
  width = 0;
  height = 0;
  padding: Padding;

  private _ro: ResizeObserver | null = null;
  private _boundMouseMove: (e: MouseEvent) => void;
  private _boundMouseLeave: () => void;
  private _boundClick: (e: MouseEvent) => void;
  private _boundTouch: (e: TouchEvent) => void;
  private _boundTouchEnd: () => void;

  constructor(container: HTMLElement | string, config: BaseChartConfig = {}) {
    if (SSR) {
      throw new Error('SwiftChart: cannot construct a chart during SSR. Construct in useEffect or after mount.');
    }

    const el = typeof container === 'string'
      ? document.querySelector<HTMLElement>(container)
      : container;
    if (!el) throw new Error(`SwiftChart: container "${container}" not found`);
    this.container = el;

    this.padding = { ...DEFAULT_PADDING, ...config.padding };
    this.config = {
      animate: true,
      animDuration: 600,
      animEasing: 'easeOutCubic',
      responsive: true,
      showGrid: true,
      showTooltip: true,
      showLegend: true,
      legendPosition: 'top',
      title: '',
      subtitle: '',
      ...config,
    };

    this.canvas = document.createElement('canvas');
    this.canvas.style.cssText = 'width:100%;height:100%;display:block;';
    // Accessibility — canvas has no semantics by default.
    this.canvas.setAttribute('role', 'img');
    if (this.config.ariaLabel) this.canvas.setAttribute('aria-label', this.config.ariaLabel);
    else if (this.config.title) this.canvas.setAttribute('aria-label', this.config.title);
    if (this.config.ariaDescription) {
      this.canvas.setAttribute('aria-description', this.config.ariaDescription);
    }
    this.canvas.tabIndex = 0;
    this.container.appendChild(this.canvas);

    const rawCtx = this.canvas.getContext('2d');
    if (!rawCtx) throw new Error('SwiftChart: Canvas 2D context unavailable');
    this.ctx = rawCtx;

    this.theme = resolveTheme(this.config.theme);
    this.animator = new Animator(this.config.animDuration, this.config.animEasing as EasingName);
    this.tooltip = this.config.showTooltip ? new Tooltip(this.canvas) : null;

    // Bind event handlers for cleanup
    this._boundMouseMove = (e: MouseEvent) => this._onMouse(e);
    this._boundMouseLeave = () => {
      this.hoverIndex = -1;
      this.tooltip?.hide();
      this._draw();
    };
    this._boundClick = (_e: MouseEvent) => {
      if (this.config.onClick && this.hoverIndex >= 0) {
        this.config.onClick(this.hoverIndex, this.resolved);
      }
    };
    this._boundTouch = (e: TouchEvent) => {
      const t = e.touches[0];
      if (!t) return;
      // Synthesise a mouse-like event for chart hover code.
      this._onMouse({
        clientX: t.clientX, clientY: t.clientY,
      } as MouseEvent);
    };
    this._boundTouchEnd = () => this._boundMouseLeave();

    this.canvas.addEventListener('mousemove', this._boundMouseMove);
    this.canvas.addEventListener('mouseleave', this._boundMouseLeave);
    this.canvas.addEventListener('click', this._boundClick);
    this.canvas.addEventListener('touchstart', this._boundTouch, { passive: true });
    this.canvas.addEventListener('touchmove', this._boundTouch, { passive: true });
    this.canvas.addEventListener('touchend', this._boundTouchEnd);
    this.canvas.addEventListener('touchcancel', this._boundTouchEnd);

    if (this.config.responsive && typeof ResizeObserver !== 'undefined') {
      this._ro = new ResizeObserver(() => { this._resize(); this._draw(); });
      this._ro.observe(this.container);
    }

    this._resize();
  }

  // ── Layout ─────────────────────────────────────────

  /** Width of left/right legend column. */
  protected _legendSideWidth(): number {
    if (!this.config.showLegend || !this.resolved.datasets.length) return 0;
    const pos = this.config.legendPosition;
    if (pos !== 'left' && pos !== 'right') return 0;
    // Estimate based on widest dataset label.
    const ff = this._fontFamily();
    this.ctx.save();
    this.ctx.font = `400 11px ${ff}`;
    let max = 0;
    for (const ds of this.resolved.datasets) {
      const w = this.ctx.measureText(ds.label || '').width;
      if (w > max) max = w;
    }
    this.ctx.restore();
    return Math.min(160, Math.max(80, Math.ceil(max + 28)));
  }

  get plotArea(): PlotArea {
    const p = this.padding;
    const pos = this.config.legendPosition;
    const showLegend = this.config.showLegend && this.resolved.datasets.length > 0;
    const titleH = this.config.title ? TITLE_HEIGHT : 0;

    const topLegend = showLegend && pos === 'top' ? LEGEND_AXIS_THICKNESS : 0;
    const bottomLegend = showLegend && pos === 'bottom' ? LEGEND_AXIS_THICKNESS : 0;
    const sideW = this._legendSideWidth();
    const leftLegend = showLegend && pos === 'left' ? sideW : 0;
    const rightLegend = showLegend && pos === 'right' ? sideW : 0;

    return {
      x: p.left + leftLegend,
      y: p.top + titleH + topLegend,
      w: Math.max(0, this.width - p.left - p.right - leftLegend - rightLegend),
      h: Math.max(0, this.height - p.top - p.bottom - titleH - topLegend - bottomLegend),
    };
  }

  // ── Public API ─────────────────────────────────────

  setData(data: Record<string, any>[] | null | undefined, mapping?: DataMapping): void {
    this.resolved = resolveData(data, { ...this.config, ...mapping } as DataMapping);
    this._animate();
  }

  setTheme(name: string): void {
    this.theme = resolveTheme(name);
    this._draw();
  }

  /**
   * Polymorphic update:
   *   - update(dataArray, mapping?) — replaces data (alias of setData).
   *   - update(configPatch) — patches non-data config (theme, title, padding, etc.).
   */
  update(
    arg: Record<string, any>[] | Partial<BaseChartConfig>,
    mapping?: DataMapping,
  ): void {
    if (Array.isArray(arg)) {
      this.setData(arg, mapping);
      return;
    }
    // Apply only defined keys so undefined props from React don't clobber defaults.
    for (const k of Object.keys(arg) as (keyof BaseChartConfig)[]) {
      const v = (arg as any)[k];
      if (v !== undefined) (this.config as any)[k] = v;
    }
    if (arg.theme) this.theme = resolveTheme(arg.theme);
    if (arg.padding) this.padding = { ...this.padding, ...arg.padding };
    if (arg.animDuration) this.animator.duration = arg.animDuration;
    if (arg.animEasing) this.animator.easing = arg.animEasing;
    if (arg.ariaLabel) this.canvas.setAttribute('aria-label', arg.ariaLabel);
    this._draw();
  }

  resize(): void {
    this._resize();
    this._draw();
  }

  /** Export the current chart as a PNG data URL. */
  toDataURL(type = 'image/png', quality = 0.92): string {
    return this.canvas.toDataURL(type, quality);
  }

  destroy(): void {
    this.animator.stop();
    this._ro?.disconnect();
    this.tooltip?.destroy();
    this.canvas.removeEventListener('mousemove', this._boundMouseMove);
    this.canvas.removeEventListener('mouseleave', this._boundMouseLeave);
    this.canvas.removeEventListener('click', this._boundClick);
    this.canvas.removeEventListener('touchstart', this._boundTouch);
    this.canvas.removeEventListener('touchmove', this._boundTouch);
    this.canvas.removeEventListener('touchend', this._boundTouchEnd);
    this.canvas.removeEventListener('touchcancel', this._boundTouchEnd);
    this.canvas.remove();
  }

  // ── Internal ───────────────────────────────────────

  protected _animate(): void {
    if (this.config.animate) {
      this.animator.start(p => { this.animProgress = p; this._draw(); });
    } else {
      this.animProgress = 1;
      this._draw();
    }
  }

  protected _resize(): void {
    const d = dpr();
    const rect = this.container.getBoundingClientRect();
    this.width = Math.max(1, rect.width);
    this.height = Math.max(1, rect.height);
    this.canvas.width = Math.round(this.width * d);
    this.canvas.height = Math.round(this.height * d);
    this.ctx.setTransform(d, 0, 0, d, 0, 0);
  }

  protected _fontFamily(): string {
    return 'system-ui, -apple-system, sans-serif';
  }

  protected _fmtVal(v: number): string {
    return this.config.formatValue ? this.config.formatValue(v) : shortNum(v);
  }

  /** Build a structured tooltip payload from a data index. */
  protected _tooltipContent(index: number): TooltipContent {
    const ds = this.resolved.datasets;
    return {
      title: this.resolved.labels[index],
      rows: ds.map((d, i) => ({
        label: d.label || `Series ${i + 1}`,
        value: this._fmtVal(d.data[index]),
        color: d.color || this.theme.colors[i % this.theme.colors.length],
      })),
    };
  }

  // ── Common Drawing Helpers ─────────────────────────

  protected _drawBg(): void {
    this.ctx.fillStyle = this.theme.bg;
    this.ctx.fillRect(0, 0, this.width, this.height);
  }

  protected _drawTitle(): void {
    if (!this.config.title) return;
    const ff = this._fontFamily();
    this.ctx.fillStyle = this.theme.text;
    this.ctx.font = `600 14px ${ff}`;
    this.ctx.textAlign = 'left';
    this.ctx.textBaseline = 'top';
    this.ctx.fillText(this.config.title, this.padding.left, this.padding.top);
    if (this.config.subtitle) {
      this.ctx.fillStyle = this.theme.textMuted;
      this.ctx.font = `400 11px ${ff}`;
      this.ctx.fillText(this.config.subtitle, this.padding.left, this.padding.top + 17);
    }
  }

  protected _drawLegend(): void {
    if (!this.config.showLegend || !this.resolved.datasets.length) return;
    const pos = this.config.legendPosition;
    if (pos === 'none') return;

    const p = this.plotArea;
    const ff = this._fontFamily();
    this.ctx.save();
    this.ctx.font = `400 11px ${ff}`;
    this.ctx.textBaseline = 'middle';

    if (pos === 'top' || pos === 'bottom') {
      const y = pos === 'top' ? p.y - 16 : p.y + p.h + 28;
      let x = p.x;
      this.resolved.datasets.forEach((ds, i) => {
        const color = ds.color || this.theme.colors[i % this.theme.colors.length];
        this.ctx.fillStyle = color;
        this.ctx.beginPath();
        this.ctx.arc(x + 5, y, 4, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.fillStyle = this.theme.textMuted;
        this.ctx.textAlign = 'left';
        const label = ds.label || `Series ${i + 1}`;
        this.ctx.fillText(label, x + 14, y);
        x += this.ctx.measureText(label).width + 30;
      });
    } else {
      // left or right column
      const x = pos === 'left' ? this.padding.left : p.x + p.w + 16;
      let y = p.y + 8;
      this.resolved.datasets.forEach((ds, i) => {
        const color = ds.color || this.theme.colors[i % this.theme.colors.length];
        this.ctx.fillStyle = color;
        this.ctx.beginPath();
        this.ctx.arc(x + 5, y, 4, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.fillStyle = this.theme.textMuted;
        this.ctx.textAlign = 'left';
        this.ctx.fillText(ds.label || `Series ${i + 1}`, x + 14, y);
        y += 18;
      });
    }
    this.ctx.restore();
  }

  protected _drawGrid(scale: NiceScale): void {
    const p = this.plotArea;
    const ff = this._fontFamily();
    const range = scale.max - scale.min || 1;
    const tickCount = Math.max(2, Math.round(range / scale.step) + 1);

    this.ctx.save();
    this.ctx.font = `400 10px ${ff}`;
    this.ctx.fillStyle = this.theme.textMuted;
    this.ctx.textAlign = 'right';
    this.ctx.textBaseline = 'middle';

    for (let i = 0; i < tickCount; i++) {
      const v = scale.min + i * scale.step;
      const y = p.y + p.h - ((v - scale.min) / range) * p.h;

      if (this.config.showGrid) {
        this.ctx.strokeStyle = this.theme.grid;
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.moveTo(p.x, y);
        this.ctx.lineTo(p.x + p.w, y);
        this.ctx.stroke();
      }

      // Tick mark on the y-axis.
      this.ctx.strokeStyle = this.theme.axis;
      this.ctx.beginPath();
      this.ctx.moveTo(p.x - 4, y);
      this.ctx.lineTo(p.x, y);
      this.ctx.stroke();

      this.ctx.fillStyle = this.theme.textMuted;
      this.ctx.fillText(this._fmtVal(v), p.x - 8, y);
    }

    // Y-axis line.
    this.ctx.strokeStyle = this.theme.axis;
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    this.ctx.moveTo(p.x, p.y);
    this.ctx.lineTo(p.x, p.y + p.h);
    this.ctx.stroke();

    this.ctx.restore();
  }

  /**
   * Draw x-axis labels with optional rotation when crowded.
   * `centered` = true positions labels in slot centres (bar charts);
   * false aligns labels with point indices (line charts).
   */
  protected _drawXLabels(labels: string[], centered = true): void {
    const p = this.plotArea;
    const ff = this._fontFamily();
    const n = labels.length;
    if (!n) return;

    this.ctx.save();
    this.ctx.font = `400 10px ${ff}`;

    // Measure max label width to decide stride / rotation.
    let maxW = 0;
    for (const l of labels) {
      const w = this.ctx.measureText(String(l)).width;
      if (w > maxW) maxW = w;
    }
    const stride = centered ? p.w / n : p.w / Math.max(1, n - 1);
    const offset = centered ? stride * 0.5 : 0;
    const labelMaxPx = stride - 4;
    const rotate = maxW > labelMaxPx;

    // Choose visible step so labels don't overlap.
    const minSpacing = rotate ? Math.min(maxW + 4, 60) : maxW + 12;
    const step = Math.max(1, Math.ceil(minSpacing / stride));

    this.ctx.fillStyle = this.theme.textMuted;
    this.ctx.strokeStyle = this.theme.axis;
    this.ctx.lineWidth = 1;

    for (let i = 0; i < n; i++) {
      const x = p.x + i * stride + offset;

      // Tick mark on the x-axis at every position.
      this.ctx.beginPath();
      this.ctx.moveTo(x, p.y + p.h);
      this.ctx.lineTo(x, p.y + p.h + 4);
      this.ctx.stroke();

      if (i % step !== 0) continue;

      const raw = String(labels[i]);
      this.ctx.textAlign = rotate ? 'right' : 'center';
      this.ctx.textBaseline = rotate ? 'middle' : 'top';

      if (rotate) {
        this.ctx.save();
        this.ctx.translate(x, p.y + p.h + 6);
        this.ctx.rotate(-Math.PI / 4);
        this.ctx.fillText(this._truncate(raw, 14), 0, 0);
        this.ctx.restore();
      } else {
        const fits = this.ctx.measureText(raw).width <= labelMaxPx;
        const display = fits ? raw : this._truncate(raw, Math.max(3, Math.floor(labelMaxPx / 7)));
        this.ctx.fillText(display, x, p.y + p.h + 8);
      }
    }

    // X-axis line.
    this.ctx.strokeStyle = this.theme.axis;
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    this.ctx.moveTo(p.x, p.y + p.h);
    this.ctx.lineTo(p.x + p.w, p.y + p.h);
    this.ctx.stroke();

    this.ctx.restore();
  }

  protected _truncate(s: string, max: number): string {
    return s.length > max ? s.slice(0, max - 1) + '…' : s;
  }

  /**
   * Draw a vertical indicator at the given index.
   * `centered`=true positions the line in the slot centre (bar layouts);
   * `centered`=false aligns to the point index (line layouts).
   */
  protected _drawCrosshair(index: number, centered = false): void {
    const p = this.plotArea;
    const n = this.resolved.labels.length;
    if (n === 0 || index < 0) return;
    const stride = centered ? p.w / n : p.w / Math.max(1, n - 1);
    const offset = centered ? stride * 0.5 : 0;
    const hx = p.x + index * stride + offset;

    this.ctx.save();
    // Soft halo so the line stays visible on busy backgrounds.
    this.ctx.strokeStyle = hexToRgba(this.theme.text, 0.08);
    this.ctx.lineWidth = 6;
    this.ctx.beginPath();
    this.ctx.moveTo(hx, p.y);
    this.ctx.lineTo(hx, p.y + p.h);
    this.ctx.stroke();

    // Solid 1-px line on top.
    this.ctx.strokeStyle = hexToRgba(this.theme.text, 0.55);
    this.ctx.lineWidth = 1;
    this.ctx.setLineDash([3, 3]);
    this.ctx.beginPath();
    this.ctx.moveTo(hx, p.y);
    this.ctx.lineTo(hx, p.y + p.h);
    this.ctx.stroke();
    this.ctx.setLineDash([]);
    this.ctx.restore();
  }

  // ── Abstract ───────────────────────────────────────
  abstract _onMouse(e: MouseEvent): void;
  abstract _draw(): void;
}
