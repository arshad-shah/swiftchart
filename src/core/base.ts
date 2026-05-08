import type {
  BaseChartConfig,
  Theme,
  Padding,
  PlotArea,
  ResolvedData,
  DataMapping,
  NiceScale,
  EasingName,
  ChartClickEvent,
} from '../types';
import { resolveTheme } from './themes';
import { Animator } from './animator';
import { Tooltip, type TooltipContent } from './tooltip';
import { dpr, resolveData, shortNum, hexToRgba } from '../utils/helpers';

const DEFAULT_PADDING: Padding = { top: 30, right: 20, bottom: 40, left: 55 };
const SSR = typeof document === 'undefined';
const LEGEND_AXIS_THICKNESS = 28;
const TITLE_HEIGHT = 32;
// Maximum delay between a `touchend` and the browser's synthetic `click`
// during which we'll honour the tap as a click. Mobile browsers typically
// fire the click within ~300ms; 700ms gives generous headroom.
const TAP_CLICK_WINDOW_MS = 700;

/**
 * Shared lifecycle, layout, theming, accessibility, and event plumbing for
 * every SwiftChart chart class. End users typically don't construct
 * `BaseChart` directly — they instantiate one of the concrete subclasses
 * (`LineChart`, `BarChart`, `PieChart`, …) — but `BaseChart` is the type
 * surfaced from `chartRef.current.chart` and from the imperative API, so
 * the public methods documented here apply to every chart.
 *
 * Public surface used by consumers:
 * - {@link setData} — replace the chart's data
 * - {@link update} — patch config or data without recreating the chart
 * - {@link setTheme} — switch palette by registered name
 * - {@link resize} — force a re-layout
 * - {@link toDataURL} — export as PNG (or other canvas-supported format)
 * - {@link destroy} — tear down listeners, observers, tooltip, canvas
 *
 * Internals worth knowing about (protected):
 * - `_rebakeColorsForTheme()` — re-resolves `colorField` colours when the
 *   theme changes. Pie/Funnel/Treemap override it to redo their bake.
 *
 * @see {@link BaseChartConfig} for the cross-chart config shape.
 */
export abstract class BaseChart {
  /** Host element the canvas was mounted into. */
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
  /**
   * Index of the series under the cursor, or `-1` when the hover is not
   * series-specific (e.g. a column hit on a multi-series line chart).
   * Charts that can pinpoint a series — bubble, scatter, network, sankey,
   * marimekko, treemap — set this in their `_onMouse`. Single-series charts
   * report `0` automatically via {@link _buildClickEvent}.
   */
  hoverSeriesIndex = -1;
  animProgress = 1;
  resolved: ResolvedData = { labels: [], datasets: [] };
  /**
   * The original rows passed to {@link setData}, kept so click events can
   * surface the user's untransformed datum. `undefined` when the chart was
   * fed pre-built `{ labels, datasets }` (no rows ever existed).
   */
  protected _rawData: any[] | undefined;
  /**
   * The most recent `mapping` argument passed to {@link setData}. Stashed so
   * `_rebakeColorsForTheme()` can re-resolve `colorField` / `colorMap` against
   * the new theme palette without forcing a full re-animation.
   */
  protected _lastMapping: DataMapping | undefined;
  width = 0;
  height = 0;
  padding: Padding;

  private _ro: ResizeObserver | null = null;
  /**
   * Pending RAF id for ResizeObserver-driven resizes. We coalesce bursty
   * layout events (window resize, flexbox jitter, panel collapse) into a
   * single rAF so heavy charts don't repaint per observer fire.
   */
  private _resizeRaf = 0;
  private _boundMouseMove: (e: MouseEvent) => void;
  private _boundMouseLeave: () => void;
  private _boundClick: (e: MouseEvent) => void;
  private _boundTouch: (e: TouchEvent) => void;
  private _boundTouchEnd: () => void;
  private _boundTouchCancel: () => void;
  // The browser fires a synthetic `click` ~300ms after `touchend` on a tap.
  // By then `_boundTouchEnd` has reset `hoverIndex` to -1, so the click guard
  // would always fail. We snapshot the index on touchend and let the click
  // handler consume it within `_TAP_CLICK_WINDOW_MS`.
  private _lastTapIndex = -1;
  private _lastTapAt = 0;

  /** Hidden description element when `ariaDescription` is set. */
  private _descEl: HTMLElement | null = null;
  /** Hidden polite live region announcing data updates to screen readers. */
  private _liveEl: HTMLElement | null = null;
  private _boundKeydown: ((e: KeyboardEvent) => void) | null = null;

  /** Monotonically-increasing instance id used to namespace ARIA ids. */
  private static _instanceCounter = 0;
  private readonly _instanceId = ++BaseChart._instanceCounter;

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

    // Honour `prefers-reduced-motion` when the user hasn't explicitly opted
    // in or out via the `animate` config. WCAG 2.3.3 — motion-sensitive
    // users get a static rendering; explicit `animate: true` from the
    // consumer is preserved.
    if (
      config.animate === undefined &&
      typeof matchMedia !== 'undefined' &&
      matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      this.config.animate = false;
    }

    const isInteractive = !!this.config.onClick;
    this.canvas = document.createElement('canvas');
    // Note: no `outline:none` — let the browser draw its native focus ring
    // when the canvas is keyboard-focused. WCAG 2.4.7 requires a visible
    // focus indicator on every interactive element.
    this.canvas.style.cssText = 'width:100%;height:100%;display:block;';

    // ── Accessibility wiring ───────────────────────────
    // - role="img" lies when the chart is interactive (it implies non-
    //   interactive content). Drop the role when an onClick is present
    //   and let the focusable canvas + aria-roledescription speak for it.
    // - tabIndex only when interactive — purely-decorative charts shouldn't
    //   pull keyboard focus into a dead element.
    // - Use aria-describedby to a hidden element instead of the not-yet-
    //   broadly-supported `aria-description` attribute.
    if (!isInteractive) {
      this.canvas.setAttribute('role', 'img');
    } else {
      this.canvas.setAttribute('aria-roledescription', 'interactive chart');
    }
    if (this.config.ariaLabel) this.canvas.setAttribute('aria-label', this.config.ariaLabel);
    else if (this.config.title) this.canvas.setAttribute('aria-label', this.config.title);
    if (isInteractive) this.canvas.tabIndex = 0;
    this.container.appendChild(this.canvas);

    // Attach the description element after the canvas so screen readers
    // announce label first then description on focus.
    if (this.config.ariaDescription) this._setDescription(this.config.ariaDescription);
    // Polite live region: announces data summaries from setData() so screen
    // readers know when the chart's content changes.
    this._liveEl = this._mountVisuallyHidden('status', 'polite');

    const rawCtx = this.canvas.getContext('2d');
    if (!rawCtx) throw new Error('SwiftChart: Canvas 2D context unavailable');
    this.ctx = rawCtx;

    this.theme = resolveTheme(this.config.theme);
    this.animator = new Animator(this.config.animDuration, this.config.animEasing as EasingName);
    this.tooltip = this.config.showTooltip
      ? new Tooltip(this.canvas, this.theme, this._tooltipMountTarget())
      : null;

    // Bind event handlers for cleanup
    this._boundMouseMove = (e: MouseEvent) => this._onMouse(e);
    this._boundMouseLeave = () => {
      this.hoverIndex = -1;
      this.hoverSeriesIndex = -1;
      this.tooltip?.hide();
      this._draw();
    };
    this._boundClick = (e: MouseEvent) => {
      if (!this.config.onClick) return;
      let idx = this.hoverIndex;
      // Touch path: hoverIndex was reset by _boundTouchEnd before the
      // synthetic click arrived. Fall back to the tap-snapshot if it's
      // still within the window. Mark consumed by clearing _lastTapAt
      // so a later stray click can't replay the tap.
      if (idx < 0 && this._lastTapIndex >= 0 &&
          performance.now() - this._lastTapAt < TAP_CLICK_WINDOW_MS) {
        idx = this._lastTapIndex;
        // Reset the snapshot, not the timestamp — `performance.now()` can
        // return a tiny value (especially in test environments), so a zero
        // timestamp wouldn't reliably read as "outside the window."
        this._lastTapIndex = -1;
      }
      if (idx < 0) return;
      const event = this._buildClickEvent(idx, e);
      this.config.onClick(idx, this.resolved, event);
    };
    this._boundTouch = (e: TouchEvent) => {
      const t = e.touches[0];
      if (!t) return;
      // Synthesise a mouse-like event for chart hover code.
      this._onMouse({
        clientX: t.clientX, clientY: t.clientY,
      } as MouseEvent);
    };
    this._boundTouchEnd = () => {
      // Snapshot the hovered datum *before* clearing it so the synthetic
      // click that follows can still resolve to a target.
      this._lastTapIndex = this.hoverIndex;
      this._lastTapAt = performance.now();
      this._boundMouseLeave();
    };
    this._boundTouchCancel = () => {
      // Cancelled gestures (system pull-down, scroll lift) must not be
      // replayed as a tap when an unrelated click arrives later.
      this._lastTapIndex = -1;
      this._lastTapAt = 0;
      this._boundMouseLeave();
    };

    if (isInteractive) {
      // Keyboard activation: Enter / Space fire onClick on the focused
      // datum (using the current hover index, or 0 if no hover yet).
      // ArrowLeft / ArrowRight step linearly through the resolved labels;
      // chart subclasses that don't have a linear axis (Pie, Treemap)
      // still benefit because the index-into-labels[] traversal makes
      // their slices keyboard-discoverable through the tooltip system.
      this._boundKeydown = (e: KeyboardEvent) => this._onKeydown(e);
      this.canvas.addEventListener('keydown', this._boundKeydown);
    }

    this.canvas.addEventListener('mousemove', this._boundMouseMove);
    this.canvas.addEventListener('mouseleave', this._boundMouseLeave);
    this.canvas.addEventListener('click', this._boundClick);
    this.canvas.addEventListener('touchstart', this._boundTouch, { passive: true });
    this.canvas.addEventListener('touchmove', this._boundTouch, { passive: true });
    this.canvas.addEventListener('touchend', this._boundTouchEnd);
    this.canvas.addEventListener('touchcancel', this._boundTouchCancel);

    // Initial sizing is explicit so first paint has dimensions even on
    // platforms where `ResizeObserver.observe()` defers its first callback
    // to after the next layout. The observer below is rAF-coalesced and
    // bails when dimensions haven't actually changed, so this _resize()
    // doesn't double up with the observer's first fire.
    this._resize();

    if (this.config.responsive && typeof ResizeObserver !== 'undefined') {
      this._ro = new ResizeObserver(() => this._scheduleResize());
      this._ro.observe(this.container);
    }
  }

  /**
   * Coalesce a burst of ResizeObserver callbacks into a single rAF. Skips
   * the redraw when the container's CSS dimensions haven't actually changed
   * (this is the path that absorbs the observer's redundant initial fire).
   */
  private _scheduleResize(): void {
    if (this._resizeRaf) return;
    this._resizeRaf = requestAnimationFrame(() => {
      this._resizeRaf = 0;
      const rect = this.container.getBoundingClientRect();
      const w = Math.max(1, rect.width);
      const h = Math.max(1, rect.height);
      // Snap-equality check is in CSS-pixel space because that's what
      // _resize() pins itself to. A few-pixel jitter from sub-pixel rect
      // values still no-ops here, which is what we want.
      if (Math.abs(w - this._lastRectW) < 0.5 && Math.abs(h - this._lastRectH) < 0.5) return;
      this._resize();
      this._draw();
    });
  }

  private _lastRectW = 0;
  private _lastRectH = 0;

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
    this._rawData = Array.isArray(data) ? data : undefined;
    this._lastMapping = mapping;
    this.resolved = resolveData(
      data,
      { ...this.config, ...mapping } as DataMapping,
      this.theme.colors,
    );
    this._announceDataUpdate();
    this._animate();
  }

  /**
   * Re-resolve any data colours that were baked at `setData` time against
   * the *current* theme palette. Default implementation handles the
   * `colorField` / `colorMap` path through {@link resolveData}; chart
   * subclasses that bake colours in their own `setData` (Pie, Funnel,
   * Treemap) override this to redo their bake without re-animating.
   *
   * No-op when no rows are stored (pre-built `{ labels, datasets }` path —
   * the consumer owns colours there) or when the last mapping had no
   * `colorField`.
   */
  protected _rebakeColorsForTheme(): void {
    if (!this._rawData) return;
    if (!this._lastMapping?.colorField) return;
    this.resolved = resolveData(
      this._rawData,
      { ...this.config, ...this._lastMapping } as DataMapping,
      this.theme.colors,
    );
  }

  setTheme(name: string): void {
    this.theme = resolveTheme(name);
    this.tooltip?.setTheme(this.theme);
    this._rebakeColorsForTheme();
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
    if (arg.theme) {
      this.theme = resolveTheme(arg.theme);
      this.tooltip?.setTheme(this.theme);
      this._rebakeColorsForTheme();
    }
    if (arg.padding) this.padding = { ...this.padding, ...arg.padding };
    if (arg.animDuration) this.animator.duration = arg.animDuration;
    if (arg.animEasing) this.animator.easing = arg.animEasing;
    if (arg.ariaLabel) this.canvas.setAttribute('aria-label', arg.ariaLabel);
    if (arg.ariaDescription !== undefined) this._setDescription(arg.ariaDescription);
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
    if (this._resizeRaf) {
      cancelAnimationFrame(this._resizeRaf);
      this._resizeRaf = 0;
    }
    this.tooltip?.destroy();
    this.canvas.removeEventListener('mousemove', this._boundMouseMove);
    this.canvas.removeEventListener('mouseleave', this._boundMouseLeave);
    this.canvas.removeEventListener('click', this._boundClick);
    this.canvas.removeEventListener('touchstart', this._boundTouch);
    this.canvas.removeEventListener('touchmove', this._boundTouch);
    this.canvas.removeEventListener('touchend', this._boundTouchEnd);
    this.canvas.removeEventListener('touchcancel', this._boundTouchCancel);
    if (this._boundKeydown) {
      this.canvas.removeEventListener('keydown', this._boundKeydown);
      this._boundKeydown = null;
    }
    this._descEl?.remove();
    this._descEl = null;
    this._liveEl?.remove();
    this._liveEl = null;
    this.canvas.remove();
  }

  /**
   * Pick where the tooltip element should mount. Honours the explicit
   * `tooltipContainer` config first, then the shadow root if the chart is
   * inside one (preserves Shadow DOM encapsulation), otherwise the chart's
   * own container — keeps the tooltip inside any stacking context the
   * consumer has set up (modals, popovers, web components, etc.).
   */
  private _tooltipMountTarget(): ParentNode {
    if (this.config.tooltipContainer) return this.config.tooltipContainer;
    const root = this.canvas.getRootNode();
    if (typeof ShadowRoot !== 'undefined' && root instanceof ShadowRoot) {
      return root;
    }
    return this.container;
  }

  // ── Accessibility helpers ──────────────────────────

  private _setDescription(text: string): void {
    if (!text) {
      if (this._descEl) {
        this._descEl.remove();
        this._descEl = null;
        this.canvas.removeAttribute('aria-describedby');
      }
      return;
    }
    if (!this._descEl) {
      this._descEl = this._mountVisuallyHidden();
      this._descEl.id = `sc-desc-${this._instanceId}`;
      this.canvas.setAttribute('aria-describedby', this._descEl.id);
    }
    this._descEl.textContent = text;
  }

  /**
   * Append a visually-hidden element to the chart container. Standard
   * "sr-only" clip pattern — invisible to sighted users, still read by AT.
   */
  private _mountVisuallyHidden(role?: string, live?: 'polite' | 'assertive'): HTMLElement {
    const el = document.createElement('div');
    el.style.cssText = 'position:absolute;width:1px;height:1px;clip:rect(0,0,0,0);overflow:hidden';
    if (role) el.setAttribute('role', role);
    if (live) el.setAttribute('aria-live', live);
    this.container.appendChild(el);
    return el;
  }

  /** Update the live region with a textual summary of the current data. */
  private _announceDataUpdate(): void {
    if (!this._liveEl) return;
    const n = this.resolved.labels?.length ?? 0;
    const s = this.resolved.datasets?.length ?? 0;
    this._liveEl.textContent = n === 0 && s === 0
      ? 'Chart cleared.'
      : `${n} point${n === 1 ? '' : 's'}${s > 1 ? `, ${s} series` : ''}.`;
  }

  /**
   * Keyboard handler for interactive charts.
   *
   * - `Enter` / `Space` activate the focused datum (hoverIndex; falls back to 0).
   * - `ArrowLeft` / `ArrowRight` walk the index along `resolved.labels`
   *   (the chart's primary axis).
   * - `ArrowUp` / `ArrowDown` walk `hoverSeriesIndex` between datasets so
   *   keyboard users can move *across* the chart on multi-series shapes
   *   (grouped bars, multi-line, stacked area, etc.). No-op when the chart
   *   has only one series.
   *
   * All key handlers update the existing hover state so the draw + tooltip
   * pipeline highlights the focused datum / series.
   */
  private _onKeydown(e: KeyboardEvent): void {
    const len = this.resolved.labels?.length ?? 0;
    if (!len) return;

    if (e.key === 'Enter' || e.key === ' ') {
      const idx = this.hoverIndex >= 0 ? this.hoverIndex : 0;
      if (idx < 0 || idx >= len) return;
      e.preventDefault();
      const synthetic = new MouseEvent('click', { bubbles: true });
      this.config.onClick?.(idx, this.resolved, this._buildClickEvent(idx, synthetic));
      return;
    }

    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault();
      const dir = e.key === 'ArrowRight' ? 1 : -1;
      const cur = this.hoverIndex < 0 ? (dir === 1 ? -1 : len) : this.hoverIndex;
      this.hoverIndex = Math.max(0, Math.min(len - 1, cur + dir));
      this._draw();
      return;
    }

    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      const sLen = this.resolved.datasets?.length ?? 0;
      if (sLen <= 1) return;
      e.preventDefault();
      const dir = e.key === 'ArrowDown' ? 1 : -1;
      // From the column-wide state (hoverSeriesIndex === -1), step into the
      // first or last series depending on direction.
      const cur = this.hoverSeriesIndex < 0 ? (dir === 1 ? -1 : sLen) : this.hoverSeriesIndex;
      this.hoverSeriesIndex = Math.max(0, Math.min(sLen - 1, cur + dir));
      this._draw();
    }
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
    this._lastRectW = Math.max(1, rect.width);
    this._lastRectH = Math.max(1, rect.height);
    // Snap CSS dimensions to multiples of 1/DPR so the backing-store can be
    // an exact integer pixel count. At fractional DPR (e.g. Windows 125% =
    // 1.25), Math.round on the backing dim leaves a half-pixel mismatch
    // between the canvas's CSS box and its bitmap, which makes integer-CSS
    // strokes land between physical pixels and look blurry.
    const backingW = Math.max(1, Math.floor(this._lastRectW * d));
    const backingH = Math.max(1, Math.floor(this._lastRectH * d));
    this.width = backingW / d;
    this.height = backingH / d;
    this.canvas.width = backingW;
    this.canvas.height = backingH;
    // Pin the canvas's CSS box to the snapped size; the inline `width:100%`
    // baseline would otherwise let the browser stretch the bitmap fractionally.
    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;
    this.ctx.setTransform(d, 0, 0, d, 0, 0);
  }

  protected _fontFamily(): string {
    return 'system-ui, -apple-system, sans-serif';
  }

  protected _fmtVal(v: number): string {
    return this.config.formatValue ? this.config.formatValue(v) : shortNum(v);
  }

  /**
   * Build the {@link ChartClickEvent} for a click at `index`. Default
   * implementation walks `resolved.datasets`/`_rawData` and uses
   * `hoverSeriesIndex` (or `0` for single-series charts).
   *
   * Charts whose `hoverIndex` does **not** index `resolved.labels` directly
   * (scatter, bubble, sankey, network, marimekko, treemap) override this
   * to map their internal flat-list index back onto the right datum/series.
   */
  protected _buildClickEvent(index: number, nativeEvent: MouseEvent): ChartClickEvent {
    const ds = this.resolved.datasets;
    const seriesIndex =
      this.hoverSeriesIndex >= 0
        ? this.hoverSeriesIndex
        : ds.length === 1 ? 0 : -1;
    const series = seriesIndex >= 0 ? ds[seriesIndex] : undefined;
    const v = series?.data[index];
    return {
      index,
      seriesIndex,
      label: this.resolved.labels[index] ?? '',
      value: typeof v === 'number' && Number.isFinite(v) ? v : NaN,
      datum: this._rawData ? this._rawData[index] : undefined,
      series,
      data: this.resolved,
      nativeEvent,
    };
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
    // Always clear the canvas first — otherwise transparent themes never wipe
    // the previous frame, and animation frames composite over each other.
    // That causes anti-aliased text to look blurry and shadow/glow effects
    // (shadowBlur) to persist after the cursor leaves a hovered datum.
    this.ctx.clearRect(0, 0, this.width, this.height);
    const bg = this.theme.bg;
    if (bg && bg !== 'transparent') {
      this.ctx.fillStyle = bg;
      this.ctx.fillRect(0, 0, this.width, this.height);
    }
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
   * Map a mouse event to a discrete slot index along the X axis. Used by
   * categorical charts (bar, stacked-bar, waterfall, candlestick, funnel,
   * etc.) — `n` slots evenly distributed across `plotArea.w`.
   * Returns -1 outside the plot area.
   */
  protected _idxFromX(e: MouseEvent, n: number): number {
    const rect = this.canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const p = this.plotArea;
    if (!n) return -1;
    const idx = Math.floor((mx - p.x) / (p.w / n));
    return idx >= 0 && idx < n ? idx : -1;
  }

  /** Same as {@link _idxFromX} but for vertical layouts (hbar, bullet, funnel). */
  protected _idxFromY(e: MouseEvent, n: number): number {
    const rect = this.canvas.getBoundingClientRect();
    const my = e.clientY - rect.top;
    const p = this.plotArea;
    if (!n) return -1;
    const idx = Math.floor((my - p.y) / (p.h / n));
    return idx >= 0 && idx < n ? idx : -1;
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
