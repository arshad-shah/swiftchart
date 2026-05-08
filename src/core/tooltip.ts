/**
 * Tooltip — floating panel mounted near the chart.
 *
 * Mount target priority (decided by the caller):
 *   1. An explicit container passed in (e.g. `BaseChartConfig.tooltipContainer`)
 *   2. The chart canvas's shadow root, if any (so a chart in a web component
 *      keeps its tooltip inside the same encapsulation boundary)
 *   3. The chart container element
 *   4. `document.body` (legacy fallback used when no target is provided)
 *
 * Renders via DOM construction (`textContent` for user data) so user-supplied
 * labels/values cannot inject markup or scripts.
 */

import type { Theme } from '../types';

/**
 * One row inside a structured tooltip — typically one series at the
 * hovered datum on a multi-series chart. All strings are rendered via
 * `textContent` (XSS-safe).
 */
export interface TooltipRow {
  /** Left-aligned label (often the series name). */
  label: string;
  /** Right-aligned formatted value (e.g. `'1,240'`, `'$5.20'`). */
  value: string;
  /**
   * Optional dot colour shown left of the label. Validated against
   * `CSS.supports('color', …)`; invalid values fall back to `#888`.
   */
  color?: string;
}

/**
 * Structured payload for {@link Tooltip.showStructured}. The chart's
 * built-in tooltip handlers build one of these per hovered point and
 * pass it to the tooltip; consumers writing custom charts can use the
 * same shape via the `tooltipFormatter` config option (see
 * {@link TooltipFormatter}).
 */
export interface TooltipContent {
  /** Bold heading line (often the x-axis label). */
  title?: string;
  /** One row per series / datum. */
  rows: TooltipRow[];
  /** Optional plain-text footer (e.g. "Total: $1.2K"). */
  footer?: string;
}

const SSR = typeof document === 'undefined';

// Fallbacks used when no chart theme has been pushed in (e.g. ad-hoc Tooltip
// usage in tests). The themed path derives all colours from the active Theme.
const DEFAULT_BG = '#0f1620f2';
const DEFAULT_BORDER = '#38bdf855';
const DEFAULT_TEXT = '#e2e8f0';
const DEFAULT_MUTED = '#94a3b8';
const GAP = 14;

interface TooltipColors {
  bg: string;
  border: string;
  text: string;
  muted: string;
}

function resolveColors(theme: Theme | null): TooltipColors {
  if (!theme) {
    return { bg: DEFAULT_BG, border: DEFAULT_BORDER, text: DEFAULT_TEXT, muted: DEFAULT_MUTED };
  }
  return {
    bg: theme.tooltipBg ?? theme.surface ?? DEFAULT_BG,
    border: theme.tooltipBorder ?? theme.axis ?? DEFAULT_BORDER,
    text: theme.tooltipText ?? theme.text ?? DEFAULT_TEXT,
    muted: theme.textMuted ?? DEFAULT_MUTED,
  };
}

/**
 * Floating tooltip panel rendered as plain DOM (not on the canvas). Each
 * `BaseChart` owns one when `showTooltip !== false` and pushes structured
 * content into it as the user hovers / focuses datums.
 *
 * Typically you don't construct this directly — `BaseChart` does that
 * for you and exposes it via `chart.tooltip`. Custom charts that draw
 * their own hover logic can call {@link show} or {@link showStructured}
 * to display a panel anchored to canvas coordinates.
 *
 * @see {@link BaseChartConfig.tooltipContainer} for portal control.
 */
export class Tooltip {
  /** The live tooltip element (null in SSR / after `destroy`). */
  el: HTMLDivElement | null;
  /** The host canvas — used to compute viewport coords from canvas coords. */
  canvas: HTMLCanvasElement;
  private _onScroll: (() => void) | null = null;
  private _scrollables: Element[] = [];
  private _colors: TooltipColors = resolveColors(null);

  /**
   * @param canvas       The chart's `<canvas>` element. Used as the
   *                     positioning anchor (canvas coords → viewport coords).
   * @param theme        Optional palette to colour the panel. Pass `null`
   *                     to use built-in fallback colours.
   * @param mountTarget  Where to append the tooltip element. Defaults to
   *                     `document.body` for compatibility, but `BaseChart`
   *                     resolves a smarter default (shadow root, then the
   *                     chart container) so Shadow DOM and modal stacking
   *                     contexts work out of the box.
   */
  constructor(
    canvas: HTMLCanvasElement,
    theme: Theme | null = null,
    mountTarget?: ParentNode,
  ) {
    this.canvas = canvas;
    this._colors = resolveColors(theme);
    if (SSR) { this.el = null; return; }

    this.el = document.createElement('div');
    this.el.setAttribute('role', 'tooltip');
    this.el.setAttribute('aria-hidden', 'true');
    this.el.className = 'sc-tooltip';
    this._applyPanelStyle();
    (mountTarget ?? document.body).appendChild(this.el);

    // Tooltip is positioned `fixed`, so any scroll — window OR any scrolling
    // ancestor of the canvas — visually disconnects it from the anchor.
    // `scroll` does NOT bubble, so a single window listener can't catch
    // scrolls inside an `overflow:auto` parent. Walk the canvas ancestry
    // and attach a scroll listener to every scrollable container.
    this._onScroll = () => this.hide();
    let p: Element | null = canvas.parentElement;
    while (p) {
      const s = getComputedStyle(p);
      const o = `${s.overflow}${s.overflowX}${s.overflowY}`;
      if (/auto|scroll|hidden|clip/.test(o)) {
        p.addEventListener('scroll', this._onScroll, { passive: true });
        this._scrollables.push(p);
      }
      p = p.parentElement;
    }
    // Window scroll/resize as a final backstop for page-level changes.
    window.addEventListener('scroll', this._onScroll, { passive: true });
    window.addEventListener('resize', this._onScroll, { passive: true });
  }

  /**
   * Apply a Theme to subsequent tooltip renders. Colours flow from
   * (in priority order):
   *   - explicit theme.tooltipBg / .tooltipBorder / .tooltipText
   *   - theme.surface / .axis / .text (so built-in themes auto-coordinate)
   *   - hard-coded fallbacks (only when no theme is set, e.g. unit tests)
   *
   * Pass `null` to revert to fallbacks.
   */
  setTheme(theme: Theme | null): void {
    this._colors = resolveColors(theme);
    this._applyPanelStyle();
  }

  private _applyPanelStyle(): void {
    if (!this.el) return;
    const c = this._colors;
    this.el.style.cssText = `
      position:fixed;pointer-events:none;opacity:0;
      transition:opacity .15s ease,transform .15s ease;
      background:${c.bg};border:1px solid ${c.border};border-radius:8px;
      padding:8px 12px;
      font-family:system-ui,-apple-system,sans-serif;font-size:12px;color:${c.text};
      z-index:9999;backdrop-filter:blur(12px);
      box-shadow:0 8px 32px #00000060;max-width:260px;
      transform:translateY(4px);line-height:1.5;
      will-change:left,top,opacity;
    `;
  }

  /** Render a tooltip from structured content. Safe against XSS. */
  showStructured(canvasX: number, canvasY: number, content: TooltipContent): void {
    if (!this.el) return;
    const c = this._colors;
    const root = document.createDocumentFragment();

    if (content.title) {
      const t = document.createElement('div');
      t.style.cssText = `font-weight:600;margin-bottom:4px;color:${c.text}`;
      t.textContent = content.title;
      root.appendChild(t);
    }

    for (const r of content.rows) {
      const row = document.createElement('div');
      row.style.cssText = 'display:flex;align-items:center;gap:6px;margin-top:2px;white-space:nowrap';
      if (r.color) {
        const dot = document.createElement('span');
        dot.style.cssText =
          `width:8px;height:8px;border-radius:50%;display:inline-block;flex-shrink:0;background:${cssColor(r.color)}`;
        row.appendChild(dot);
      }
      const label = document.createElement('span');
      label.style.color = c.muted;
      label.textContent = r.label;
      row.appendChild(label);
      const val = document.createElement('b');
      val.style.cssText = `margin-left:auto;padding-left:8px;color:${c.text}`;
      val.textContent = r.value;
      row.appendChild(val);
      root.appendChild(row);
    }

    if (content.footer) {
      const f = document.createElement('div');
      f.style.cssText =
        `border-top:1px solid ${c.border};margin-top:6px;padding-top:4px;color:${c.muted};font-size:11px`;
      f.textContent = content.footer;
      root.appendChild(f);
    }

    this._renderNode(canvasX, canvasY, root);
  }

  /** Show plain text (escaped automatically). */
  show(canvasX: number, canvasY: number, text: string): void {
    if (!this.el) return;
    const wrap = document.createElement('div');
    wrap.textContent = text;
    this._renderNode(canvasX, canvasY, wrap);
  }

  private _renderNode(canvasX: number, canvasY: number, node: Node): void {
    if (!this.el) return;
    while (this.el.firstChild) this.el.removeChild(this.el.firstChild);
    this.el.appendChild(node);
    this.el.setAttribute('aria-hidden', 'false');
    this.el.style.opacity = '1';
    this.el.style.transform = 'translateY(0)';

    const rect = this.canvas.getBoundingClientRect();
    const cx = rect.left + canvasX;
    const cy = rect.top + canvasY;
    const tw = this.el.offsetWidth;
    const th = this.el.offsetHeight;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let tx = cx + GAP;
    let ty = cy - th / 2;

    // Flip to the other side if it would overflow.
    if (tx + tw > vw - 8) tx = cx - tw - GAP;
    if (tx < 8) tx = 8;
    if (ty < 8) ty = 8;
    if (ty + th > vh - 8) ty = vh - th - 8;

    this.el.style.left = tx + 'px';
    this.el.style.top = ty + 'px';
  }

  /** Fade and hide the tooltip. Idempotent. */
  hide(): void {
    if (!this.el) return;
    this.el.style.opacity = '0';
    this.el.style.transform = 'translateY(4px)';
    this.el.setAttribute('aria-hidden', 'true');
  }

  /**
   * Tear down: detach scroll/resize listeners (window + each scrollable
   * ancestor walked at construction) and remove the tooltip element from
   * the DOM. After `destroy`, `el` is `null` and any further calls are
   * no-ops.
   */
  destroy(): void {
    if (this._onScroll) {
      for (const el of this._scrollables) {
        el.removeEventListener('scroll', this._onScroll);
      }
      this._scrollables = [];
      window.removeEventListener('scroll', this._onScroll);
      window.removeEventListener('resize', this._onScroll);
      this._onScroll = null;
    }
    this.el?.remove();
    this.el = null;
  }
}

/** Restrict an inline color string to a small allow-list of CSS shapes. */
function cssColor(c: string): string {
  const s = String(c).trim();
  if (/^#[0-9a-fA-F]{3,8}$/.test(s)) return s;
  if (/^rgba?\([\d.,\s%]+\)$/.test(s)) return s;
  if (/^hsla?\([\d.,\s%]+\)$/.test(s)) return s;
  if (/^[a-zA-Z]+$/.test(s)) return s;
  return '#888';
}
