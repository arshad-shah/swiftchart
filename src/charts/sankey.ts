import type { SankeyChartConfig, SankeyNode, SankeyLink } from '../types';
import { BaseChart } from '../core/base';
import { hexToRgba } from '../utils/helpers';
import { layoutSankey, type SankeyLayout } from '../perf/layout/sankey';

/**
 * Canvas 2D Sankey diagram. Pass a `{nodes, links}` object directly via
 * `setSankey()` (or via `setData([], { nodes, links } as any)` from React).
 *
 * Layout is delegated to `layoutSankey` (column-DAG + iterative relaxation),
 * keeping draw passes O(nodes + links).
 *
 * @example
 * ```ts
 * const chart = new SankeyChart('#chart');
 * chart.setSankey(
 *   [{ id: 'A' }, { id: 'B' }, { id: 'C' }],
 *   [{ source: 'A', target: 'B', value: 10 }, { source: 'A', target: 'C', value: 5 }],
 * );
 * ```
 */
export class SankeyChart extends BaseChart {
  declare config: SankeyChartConfig & BaseChart['config'];

  private _nodes: SankeyNode[] = [];
  private _links: SankeyLink[] = [];
  private _layout: SankeyLayout | null = null;

  constructor(container: HTMLElement | string, config: SankeyChartConfig = {}) {
    super(container, {
      padding: { top: 30, right: 80, bottom: 20, left: 80 },
      showGrid: false, showLegend: false,
      ...config,
    });
  }

  /** Set the Sankey graph and trigger an entry animation. */
  setSankey(nodes: SankeyNode[], links: SankeyLink[]): void {
    this._nodes = nodes;
    this._links = links;
    this._layout = null;
    this.resolved = { labels: nodes.map((n) => n.label || n.id), datasets: [] };
    this._animate();
  }

  /** React passes the graph through `mapping`; we forward to `setSankey`. */
  setData(_data: any, mapping?: any): void {
    if (mapping?.nodes && mapping?.links) {
      this.setSankey(mapping.nodes, mapping.links);
    } else {
      this._nodes = []; this._links = []; this._layout = null;
      this.resolved = { labels: [], datasets: [] };
      this._animate();
    }
  }

  private _ensureLayout(): SankeyLayout | null {
    if (!this._nodes.length) return null;
    const p = this.plotArea;
    if (this._layout) return this._layout;
    this._layout = layoutSankey(this._nodes, this._links, {
      x: p.x, y: p.y, w: p.w, h: p.h,
      nodeWidth: this.config.nodeWidth ?? 14,
      nodePadding: this.config.nodePadding ?? 12,
    });
    return this._layout;
  }

  _onMouse(e: MouseEvent): void {
    const layout = this._ensureLayout();
    if (!layout) return;
    const rect = this.canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    this.hoverIndex = -1;
    for (let i = 0; i < layout.nodes.length; i++) {
      const n = layout.nodes[i];
      if (mx >= n.x && mx <= n.x + n.w && my >= n.y && my <= n.y + n.h) {
        this.hoverIndex = i;
        break;
      }
    }
    if (this.hoverIndex >= 0 && this.tooltip) {
      const node = layout.nodes[this.hoverIndex];
      this.tooltip.showStructured(mx, my, {
        title: node.label,
        rows: [
          { label: 'in',  value: this._fmtVal(node.valueIn),  color: this.theme.colors[0] },
          { label: 'out', value: this._fmtVal(node.valueOut), color: this.theme.colors[1] },
        ],
      });
    } else this.tooltip?.hide();
    this._draw();
  }

  _draw(): void {
    if (!this._nodes.length) return;
    this._drawBg();
    this._drawTitle();
    this._layout = null; // invalidate; size may have changed
    const layout = this._ensureLayout();
    if (!layout) return;
    const t = this.animProgress;
    const ff = this._fontFamily();

    // Links (drawn first so node rectangles cap them cleanly).
    for (let li = 0; li < layout.links.length; li++) {
      const link = layout.links[li];
      const s = layout.nodes[link.source];
      const tn = layout.nodes[link.target];
      const x0 = s.x + s.w;
      const x1 = tn.x;
      const y0 = s.y + link.sy0 + link.width / 2;
      const y1 = tn.y + link.ty0 + link.width / 2;
      const cx = (x0 + x1) / 2;

      const color = s.color || this.theme.colors[link.source % this.theme.colors.length];
      const isHover = this.hoverIndex === link.source || this.hoverIndex === link.target;
      this.ctx.strokeStyle = hexToRgba(color, isHover ? 0.55 : 0.28);
      this.ctx.lineWidth = link.width * t;
      this.ctx.lineCap = 'butt';
      this.ctx.beginPath();
      this.ctx.moveTo(x0, y0);
      this.ctx.bezierCurveTo(cx, y0, cx, y1, x1, y1);
      this.ctx.stroke();
    }

    // Nodes.
    for (let i = 0; i < layout.nodes.length; i++) {
      const n = layout.nodes[i];
      const color = n.color || this.theme.colors[i % this.theme.colors.length];
      const isHover = i === this.hoverIndex;
      this.ctx.fillStyle = isHover ? color : hexToRgba(color, 0.85);
      this.ctx.fillRect(n.x, n.y, n.w, n.h * t);

      // Label outside the node rect, on whichever side has more room.
      this.ctx.fillStyle = this.theme.text;
      this.ctx.font = `500 11px ${ff}`;
      this.ctx.textBaseline = 'middle';
      const yC = n.y + (n.h * t) / 2;
      const rightSpace = this.plotArea.x + this.plotArea.w - (n.x + n.w);
      if (rightSpace > 60) {
        this.ctx.textAlign = 'left';
        this.ctx.fillText(n.label, n.x + n.w + 6, yC);
      } else {
        this.ctx.textAlign = 'right';
        this.ctx.fillText(n.label, n.x - 6, yC);
      }
    }
  }
}
