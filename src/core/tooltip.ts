/**
 * Tooltip — floating panel attached to body.
 *
 * Renders via DOM construction (`textContent` for user data) so user-supplied
 * labels/values cannot inject markup or scripts.
 */

export interface TooltipRow {
  label: string;
  value: string;
  color?: string;
}
export interface TooltipContent {
  title?: string;
  rows: TooltipRow[];
  /** Optional plain-text footer (e.g. "Total: $1.2K"). */
  footer?: string;
}

const SSR = typeof document === 'undefined';

const PANEL_BG = '#0f1620f2';
const PANEL_BORDER = '#38bdf855';
const GAP = 14;

export class Tooltip {
  el: HTMLDivElement | null;
  canvas: HTMLCanvasElement;
  private _onScroll: (() => void) | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    if (SSR) { this.el = null; return; }

    this.el = document.createElement('div');
    this.el.setAttribute('role', 'tooltip');
    this.el.setAttribute('aria-hidden', 'true');
    this.el.className = 'sc-tooltip';
    this.el.style.cssText = `
      position:fixed;pointer-events:none;opacity:0;
      transition:opacity .15s ease,transform .15s ease;
      background:${PANEL_BG};border:1px solid ${PANEL_BORDER};border-radius:8px;
      padding:8px 12px;
      font-family:system-ui,-apple-system,sans-serif;font-size:12px;color:#e2e8f0;
      z-index:9999;backdrop-filter:blur(12px);
      box-shadow:0 8px 32px #00000060;max-width:260px;
      transform:translateY(4px);line-height:1.5;
      will-change:left,top,opacity;
    `;
    document.body.appendChild(this.el);

    // Tooltip is positioned `fixed`, so any scroll (window or any scrolling
    // ancestor) visually disconnects it from the data point it was anchored
    // to. Hide on scroll — re-hovering brings it back at the new position.
    // The capture phase + passive flag catch scrolls on every ancestor.
    this._onScroll = () => this.hide();
    window.addEventListener('scroll', this._onScroll, { capture: true, passive: true });
    window.addEventListener('resize', this._onScroll, { passive: true });
  }

  /** Render a tooltip from structured content. Safe against XSS. */
  showStructured(canvasX: number, canvasY: number, content: TooltipContent): void {
    if (!this.el) return;
    const root = document.createDocumentFragment();

    if (content.title) {
      const t = document.createElement('div');
      t.style.cssText = 'font-weight:600;margin-bottom:4px;color:#f1f5f9';
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
      label.style.color = '#94a3b8';
      label.textContent = r.label;
      row.appendChild(label);
      const val = document.createElement('b');
      val.style.cssText = 'margin-left:auto;padding-left:8px;color:#f1f5f9';
      val.textContent = r.value;
      row.appendChild(val);
      root.appendChild(row);
    }

    if (content.footer) {
      const f = document.createElement('div');
      f.style.cssText =
        'border-top:1px solid #ffffff15;margin-top:6px;padding-top:4px;color:#94a3b8;font-size:11px';
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

  hide(): void {
    if (!this.el) return;
    this.el.style.opacity = '0';
    this.el.style.transform = 'translateY(4px)';
    this.el.setAttribute('aria-hidden', 'true');
  }

  destroy(): void {
    if (this._onScroll) {
      window.removeEventListener('scroll', this._onScroll, { capture: true } as any);
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
