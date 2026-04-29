/**
 * Quadtree for O(log n) nearest-neighbour lookups.
 *
 * Optimized for chart hit-testing: insert screen-space (px) points
 * after layout, then query nearest on mousemove.
 */

export interface QTPoint {
  sx: number; // screen x (px)
  sy: number; // screen y (px)
  index: number; // original data index
  group?: number; // optional group/series index
}

interface QTBounds {
  x: number;
  y: number;
  w: number;
  h: number;
}

const MAX_POINTS = 8; // split threshold per node
const MAX_DEPTH = 12;

class QTNode {
  bounds: QTBounds;
  points: QTPoint[];
  children: QTNode[] | null = null;
  depth: number;

  constructor(bounds: QTBounds, depth = 0) {
    this.bounds = bounds;
    this.points = [];
    this.depth = depth;
  }

  insert(pt: QTPoint): void {
    if (!this._contains(pt)) return;

    if (this.children) {
      for (const child of this.children) child.insert(pt);
      return;
    }

    this.points.push(pt);
    if (this.points.length > MAX_POINTS && this.depth < MAX_DEPTH) {
      this._subdivide();
    }
  }

  nearest(qx: number, qy: number, maxDist: number): QTPoint | null {
    let best: QTPoint | null = null;
    let bestDist = maxDist * maxDist; // work in squared distances

    this._nearestImpl(qx, qy, bestDist, (pt, d2) => {
      if (d2 < bestDist) {
        bestDist = d2;
        best = pt;
      }
    });

    return best;
  }

  private _nearestImpl(
    qx: number,
    qy: number,
    maxDist2: number,
    cb: (pt: QTPoint, dist2: number) => void,
  ): void {
    // Early exit if this node's bounds are too far
    const b = this.bounds;
    const closestX = Math.max(b.x, Math.min(qx, b.x + b.w));
    const closestY = Math.max(b.y, Math.min(qy, b.y + b.h));
    const edgeDist2 = (qx - closestX) ** 2 + (qy - closestY) ** 2;
    if (edgeDist2 > maxDist2) return;

    if (this.children) {
      for (const child of this.children) {
        child._nearestImpl(qx, qy, maxDist2, (pt, d2) => {
          cb(pt, d2);
          if (d2 < maxDist2) maxDist2 = d2;
        });
      }
      return;
    }

    for (const pt of this.points) {
      const d2 = (qx - pt.sx) ** 2 + (qy - pt.sy) ** 2;
      cb(pt, d2);
    }
  }

  /**
   * Find all points within a rectangular region.
   */
  queryRect(rx: number, ry: number, rw: number, rh: number): QTPoint[] {
    const results: QTPoint[] = [];
    this._queryRectImpl(rx, ry, rw, rh, results);
    return results;
  }

  private _queryRectImpl(rx: number, ry: number, rw: number, rh: number, out: QTPoint[]): void {
    const b = this.bounds;
    // No overlap check
    if (rx > b.x + b.w || rx + rw < b.x || ry > b.y + b.h || ry + rh < b.y) return;

    if (this.children) {
      for (const child of this.children) child._queryRectImpl(rx, ry, rw, rh, out);
      return;
    }

    for (const pt of this.points) {
      if (pt.sx >= rx && pt.sx <= rx + rw && pt.sy >= ry && pt.sy <= ry + rh) {
        out.push(pt);
      }
    }
  }

  get size(): number {
    if (this.children) return this.children.reduce((s, c) => s + c.size, 0);
    return this.points.length;
  }

  private _contains(pt: QTPoint): boolean {
    const b = this.bounds;
    return pt.sx >= b.x && pt.sx <= b.x + b.w && pt.sy >= b.y && pt.sy <= b.y + b.h;
  }

  private _subdivide(): void {
    const { x, y, w, h } = this.bounds;
    const hw = w / 2, hh = h / 2;
    const nd = this.depth + 1;
    this.children = [
      new QTNode({ x, y, w: hw, h: hh }, nd),
      new QTNode({ x: x + hw, y, w: hw, h: hh }, nd),
      new QTNode({ x, y: y + hh, w: hw, h: hh }, nd),
      new QTNode({ x: x + hw, y: y + hh, w: hw, h: hh }, nd),
    ];
    for (const pt of this.points) {
      for (const child of this.children) child.insert(pt);
    }
    this.points = [];
  }
}

/**
 * Build a Quadtree from an array of screen-space points.
 */
export class Quadtree {
  root: QTNode;

  constructor(bounds: QTBounds) {
    this.root = new QTNode(bounds);
  }

  insert(pt: QTPoint): void {
    this.root.insert(pt);
  }

  insertAll(pts: QTPoint[]): void {
    for (const pt of pts) this.root.insert(pt);
  }

  /**
   * Find the nearest point to (x, y) within maxDist pixels.
   */
  nearest(x: number, y: number, maxDist = 20): QTPoint | null {
    return this.root.nearest(x, y, maxDist);
  }

  /**
   * Find all points in a rectangle.
   */
  queryRect(x: number, y: number, w: number, h: number): QTPoint[] {
    return this.root.queryRect(x, y, w, h);
  }

  get size(): number {
    return this.root.size;
  }

  /**
   * Build a Quadtree from flat arrays of screen coords.
   */
  static fromArrays(
    sxs: number[],
    sys: number[],
    bounds: QTBounds,
    groups?: number[],
  ): Quadtree {
    const qt = new Quadtree(bounds);
    for (let i = 0; i < sxs.length; i++) {
      qt.insert({ sx: sxs[i], sy: sys[i], index: i, group: groups?.[i] });
    }
    return qt;
  }
}
