import type { NetworkChartConfig, NetworkNode, NetworkLink } from '../types';
import { BaseChart } from '../core/base';
import { hexToRgba } from '../utils/helpers';
import { simulateForce, type ForceNode } from '../perf/layout/force';

interface SimNode extends ForceNode {
  id: string;
  label: string;
  group?: string | number;
  size: number;
}

/**
 * Force-directed network graph. Layout is computed once on data change via
 * {@link simulateForce} (`O(iters × n²)`); draws after that are O(n + edges).
 *
 * Pass the graph through React `mapping={{ nodes, links }}` or via the
 * imperative `setGraph(nodes, links)` method.
 */
export class NetworkChart extends BaseChart {
  declare config: NetworkChartConfig & BaseChart['config'];

  private _nodes: SimNode[] = [];
  private _links: { source: number; target: number; value: number }[] = [];

  constructor(container: HTMLElement | string, config: NetworkChartConfig = {}) {
    super(container, {
      padding: { top: 30, right: 20, bottom: 20, left: 20 },
      showGrid: false,
      ...config,
    });
  }

  setGraph(nodes: NetworkNode[], links: NetworkLink[]): void {
    const idIdx = new Map<string, number>();
    nodes.forEach((n, i) => idIdx.set(n.id, i));
    // Seed positions on a circle for stable, deterministic layouts.
    const N = nodes.length;
    const cx = this.width / 2;
    const cy = this.height / 2;
    const r = Math.min(this.width, this.height) * 0.35;
    this._nodes = nodes.map((n, i) => ({
      id: n.id,
      label: n.label || n.id,
      group: n.group,
      size: n.size ?? 6,
      x: cx + Math.cos((i / N) * Math.PI * 2) * r,
      y: cy + Math.sin((i / N) * Math.PI * 2) * r,
      vx: 0, vy: 0,
    }));
    this._links = links
      .map((l) => ({
        source: idIdx.get(l.source) ?? -1,
        target: idIdx.get(l.target) ?? -1,
        value: l.value ?? 1,
      }))
      .filter((l) => l.source >= 0 && l.target >= 0);

    simulateForce(this._nodes, this._links, {
      cx, cy,
      iterations: this.config.iterations ?? 200,
      linkStrength: this.config.linkStrength ?? 0.05,
      chargeStrength: this.config.chargeStrength ?? 300,
    });
    this.resolved = { labels: this._nodes.map((n) => n.label), datasets: [] };
    this._animate();
  }

  setData(_data: any, mapping?: any): void {
    if (mapping?.nodes && mapping?.links) {
      this.setGraph(mapping.nodes, mapping.links);
    } else {
      this._nodes = []; this._links = [];
      this.resolved = { labels: [], datasets: [] };
      this._animate();
    }
  }

  _onMouse(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    this.hoverIndex = -1;
    let bestD = Infinity;
    for (let i = 0; i < this._nodes.length; i++) {
      const n = this._nodes[i];
      const d = (mx - n.x) ** 2 + (my - n.y) ** 2;
      const r2 = (n.size + 4) ** 2;
      if (d < r2 && d < bestD) {
        bestD = d;
        this.hoverIndex = i;
      }
    }
    if (this.hoverIndex >= 0 && this.tooltip) {
      const n = this._nodes[this.hoverIndex];
      this.tooltip.showStructured(n.x, n.y, {
        title: n.label,
        rows: [{ label: 'group', value: String(n.group ?? '—'),
          color: this._groupColor(n.group) }],
      });
    } else this.tooltip?.hide();
    this._draw();
  }

  private _groupColor(g?: string | number): string {
    if (g == null) return this.theme.colors[0];
    const key = typeof g === 'number' ? g : Math.abs(this._hash(String(g)));
    return this.theme.colors[key % this.theme.colors.length];
  }

  private _hash(s: string): number {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
    return h;
  }

  _draw(): void {
    if (!this._nodes.length) return;
    this._drawBg();
    this._drawTitle();
    const t = this.animProgress;

    // Edges first.
    this.ctx.strokeStyle = hexToRgba(this.theme.text, 0.18);
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    for (let i = 0; i < this._links.length; i++) {
      const l = this._links[i];
      const a = this._nodes[l.source];
      const b = this._nodes[l.target];
      this.ctx.moveTo(a.x, a.y);
      this.ctx.lineTo(b.x, b.y);
    }
    this.ctx.stroke();

    // Nodes.
    for (let i = 0; i < this._nodes.length; i++) {
      const n = this._nodes[i];
      const isHover = i === this.hoverIndex;
      const r = (n.size + (isHover ? 3 : 0)) * t;
      const color = this._groupColor(n.group);
      this.ctx.beginPath();
      this.ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
      this.ctx.fillStyle = color;
      this.ctx.fill();
      this.ctx.strokeStyle = this.theme.bg;
      this.ctx.lineWidth = 1.5;
      this.ctx.stroke();
    }
  }
}
