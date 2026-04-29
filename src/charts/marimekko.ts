import type { MarimekkoChartConfig } from '../types';
import { BaseChart } from '../core/base';
import { hexToRgba } from '../utils/helpers';

interface MarimekkoCell {
  x: number; y: number; w: number; h: number;
  value: number; colIdx: number; rowIdx: number; color: string;
}

/**
 * Marimekko / mosaic chart. Column widths reflect the share of each x-axis
 * category in the grand total; row segments inside each column reflect the
 * proportional split of that column's series values.
 *
 * @example
 * ```ts
 * new MarimekkoChart('#chart').setData(rows, { x: 'segment', y: ['premium', 'plus', 'free'] });
 * ```
 */
export class MarimekkoChart extends BaseChart {
  declare config: MarimekkoChartConfig & BaseChart['config'];

  _onMouse(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const layout = this._compute();
    if (!layout) return;
    this.hoverIndex = -1;
    let title = '';
    let rows: { label: string; value: string; color?: string }[] = [];
    for (const cell of layout.cells) {
      if (mx >= cell.x && mx <= cell.x + cell.w && my >= cell.y && my <= cell.y + cell.h) {
        this.hoverIndex = cell.colIdx * 1000 + cell.rowIdx;
        const colTotal = layout.colTotals[cell.colIdx] || 1;
        title = `${this.resolved.labels[cell.colIdx]} · ${this.resolved.datasets[cell.rowIdx].label}`;
        rows = [
          { label: 'value', value: this._fmtVal(cell.value), color: cell.color },
          { label: 'col share', value: `${((cell.value / colTotal) * 100).toFixed(1)}%` },
          { label: 'overall', value: `${((cell.value / layout.grand) * 100).toFixed(1)}%` },
        ];
        break;
      }
    }
    if (this.hoverIndex >= 0 && this.tooltip) {
      this.tooltip.showStructured(mx, my, { title, rows });
    } else this.tooltip?.hide();
    this._draw();
  }

  /** Compute layout once per draw — pure function of resolved + plotArea. */
  private _compute(): {
    cells: MarimekkoCell[];
    colTotals: number[];
    grand: number;
  } | null {
    const { labels, datasets } = this.resolved;
    if (!labels.length || !datasets.length) return null;

    const n = labels.length;
    const colTotals = new Array<number>(n).fill(0);
    let grand = 0;
    for (let i = 0; i < n; i++) {
      let s = 0;
      for (let si = 0; si < datasets.length; si++) {
        const v = datasets[si].data[i];
        if (v > 0) s += v;
      }
      colTotals[i] = s;
      grand += s;
    }
    if (grand <= 0) return null;
    const p = this.plotArea;
    const t = this.animProgress;
    const cells: MarimekkoCell[] = [];
    let x = p.x;
    for (let i = 0; i < n; i++) {
      const colW = (colTotals[i] / grand) * p.w * t;
      let y = p.y;
      const colTotal = colTotals[i] || 1;
      for (let si = 0; si < datasets.length; si++) {
        const v = datasets[si].data[i];
        if (v <= 0) continue;
        const segH = (v / colTotal) * p.h;
        const color = datasets[si].color || this.theme.colors[si % this.theme.colors.length];
        cells.push({ x, y, w: colW, h: segH, value: v, colIdx: i, rowIdx: si, color });
        y += segH;
      }
      x += colW;
    }
    return { cells, colTotals, grand };
  }

  _draw(): void {
    this._drawBg();
    this._drawTitle();
    const layout = this._compute();
    if (!layout) return;
    this._drawLegend();
    const ff = this._fontFamily();
    const showLabels = this.config.showLabels !== false;
    const p = this.plotArea;

    for (const cell of layout.cells) {
      const isHover = this.hoverIndex === cell.colIdx * 1000 + cell.rowIdx;
      this.ctx.fillStyle = isHover ? cell.color : hexToRgba(cell.color, 0.85);
      if (isHover) {
        this.ctx.shadowColor = hexToRgba(cell.color, 0.35);
        this.ctx.shadowBlur = 10;
      }
      this.ctx.fillRect(cell.x + 0.5, cell.y + 0.5, Math.max(0, cell.w - 1), Math.max(0, cell.h - 1));
      this.ctx.shadowBlur = 0;
      if (showLabels && cell.w > 36 && cell.h > 18) {
        const colTotal = layout.colTotals[cell.colIdx] || 1;
        const pct = ((cell.value / colTotal) * 100).toFixed(0);
        this.ctx.fillStyle = this.theme.onAccent;
        this.ctx.font = `500 10px ${ff}`;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(`${pct}%`, cell.x + cell.w / 2, cell.y + cell.h / 2);
      }
    }

    // Column labels under the plot.
    this.ctx.fillStyle = this.theme.textMuted;
    this.ctx.font = `400 10px ${ff}`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'top';
    let cx = p.x;
    for (let i = 0; i < this.resolved.labels.length; i++) {
      const w = (layout.colTotals[i] / layout.grand) * p.w;
      this.ctx.fillText(this._truncate(this.resolved.labels[i], 8), cx + w / 2, p.y + p.h + 4);
      cx += w;
    }
  }
}
