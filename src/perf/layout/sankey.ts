/**
 * Lightweight Sankey layout: column assignment by longest path, vertical
 * positioning by iterative relaxation. Pure compute — no DOM access.
 *
 * Complexity is `O(iterations × (links + nodes))`. Iterations default to 16
 * which is sufficient for the diagram sizes typical in dashboards.
 */

export interface RawSankeyNode {
  id: string;
  label?: string;
  color?: string;
}
export interface RawSankeyLink {
  source: string;
  target: string;
  value: number;
}

export interface LaidOutSankeyNode {
  id: string;
  label: string;
  color?: string;
  /** Column index (0 = first source, max = last sink). */
  col: number;
  /** Pixel rect. */
  x: number;
  y: number;
  w: number;
  h: number;
  /** Sum of incoming flow. */
  valueIn: number;
  /** Sum of outgoing flow. */
  valueOut: number;
}

export interface LaidOutSankeyLink {
  source: number;
  target: number;
  value: number;
  /** Y offset of this link inside the source node. */
  sy0: number;
  /** Y offset of this link inside the target node. */
  ty0: number;
  /** Pixel thickness (== source/target band height). */
  width: number;
}

export interface SankeyLayoutOptions {
  x: number;
  y: number;
  w: number;
  h: number;
  /** Pixel width of node rectangles. Default 14. */
  nodeWidth?: number;
  /** Pixel gap between nodes within a column. Default 12. */
  nodePadding?: number;
  /** Relaxation iterations. Default 16. */
  iterations?: number;
}

export interface SankeyLayout {
  nodes: LaidOutSankeyNode[];
  links: LaidOutSankeyLink[];
}

/** Compute a sankey layout for the given graph. */
export function layoutSankey(
  rawNodes: RawSankeyNode[],
  rawLinks: RawSankeyLink[],
  opts: SankeyLayoutOptions,
): SankeyLayout {
  const nodeWidth = opts.nodeWidth ?? 14;
  const nodePadding = opts.nodePadding ?? 12;
  const iterations = opts.iterations ?? 16;

  // Build adjacency. Index nodes by id.
  const idIdx = new Map<string, number>();
  rawNodes.forEach((n, i) => idIdx.set(n.id, i));
  const nodes: LaidOutSankeyNode[] = rawNodes.map((n) => ({
    id: n.id,
    label: n.label ?? n.id,
    color: n.color,
    col: 0,
    x: 0,
    y: 0,
    w: nodeWidth,
    h: 0,
    valueIn: 0,
    valueOut: 0,
  }));

  const outLinks: number[][] = nodes.map(() => []);
  const inLinks: number[][] = nodes.map(() => []);
  const links: LaidOutSankeyLink[] = [];
  for (const l of rawLinks) {
    const s = idIdx.get(l.source);
    const t = idIdx.get(l.target);
    if (s === undefined || t === undefined || l.value <= 0) continue;
    const li = links.length;
    links.push({ source: s, target: t, value: l.value, sy0: 0, ty0: 0, width: 0 });
    outLinks[s].push(li);
    inLinks[t].push(li);
    nodes[s].valueOut += l.value;
    nodes[t].valueIn += l.value;
  }

  // Column assignment: longest path from any source.
  const N = nodes.length;
  const indeg = inLinks.map((a) => a.length);
  const queue: number[] = [];
  for (let i = 0; i < N; i++) if (indeg[i] === 0) queue.push(i);
  while (queue.length) {
    const i = queue.shift() as number;
    for (const li of outLinks[i]) {
      const t = links[li].target;
      const tcol = nodes[i].col + 1;
      if (tcol > nodes[t].col) nodes[t].col = tcol;
      if (--indeg[t] === 0) queue.push(t);
    }
  }
  let maxCol = 0;
  for (const n of nodes) if (n.col > maxCol) maxCol = n.col;

  // Sink-only columns: pull pure sinks to the rightmost column.
  for (let i = 0; i < N; i++) {
    if (outLinks[i].length === 0) nodes[i].col = maxCol;
  }

  // Group nodes by column.
  const columns: number[][] = Array.from({ length: maxCol + 1 }, () => []);
  for (let i = 0; i < N; i++) columns[nodes[i].col].push(i);

  // Pixel column x positions.
  const colCount = columns.length;
  const colSpacing = colCount > 1 ? (opts.w - nodeWidth) / (colCount - 1) : 0;
  for (let c = 0; c < colCount; c++) {
    const xc = opts.x + c * colSpacing;
    for (const i of columns[c]) nodes[i].x = xc;
  }

  // Initial heights and y positions per column.
  const valueByCol = columns.map((col) =>
    col.reduce((s, i) => s + Math.max(nodes[i].valueIn, nodes[i].valueOut), 0),
  );
  const tallestSum = Math.max(...valueByCol, 1);
  const ky =
    (opts.h - nodePadding * Math.max(...columns.map((c) => c.length - 1), 0)) / tallestSum;

  for (let c = 0; c < colCount; c++) {
    let yy = opts.y;
    for (const i of columns[c]) {
      const v = Math.max(nodes[i].valueIn, nodes[i].valueOut);
      nodes[i].h = v * ky;
      nodes[i].y = yy;
      yy += nodes[i].h + nodePadding;
    }
  }

  // Relax: alternate weighted averages from upstream/downstream and resolve overlaps.
  for (let it = 0; it < iterations; it++) {
    // Forward pass.
    for (let c = 1; c < colCount; c++) relaxToTargets(c);
    resolveCollisions();
    // Backward pass.
    for (let c = colCount - 2; c >= 0; c--) relaxToSources(c);
    resolveCollisions();
  }

  // Stable order: sort each node's out/in by partner y, then accumulate offsets.
  for (let i = 0; i < N; i++) {
    outLinks[i].sort((a, b) => nodes[links[a].target].y - nodes[links[b].target].y);
    inLinks[i].sort((a, b) => nodes[links[a].source].y - nodes[links[b].source].y);
  }
  for (let i = 0; i < N; i++) {
    let sy = 0;
    for (const li of outLinks[i]) {
      const w = links[li].value * ky;
      links[li].sy0 = sy;
      links[li].width = w;
      sy += w;
    }
    let ty = 0;
    for (const li of inLinks[i]) {
      links[li].ty0 = ty;
      ty += links[li].value * ky;
    }
  }

  return { nodes, links };

  // --- helpers ------------------------------------------------------------
  function weightedY(linkIndices: number[], otherSide: 'source' | 'target'): number {
    let totalV = 0;
    let totalY = 0;
    for (const li of linkIndices) {
      const link = links[li];
      const other = nodes[otherSide === 'source' ? link.source : link.target];
      const center = other.y + other.h / 2;
      totalV += link.value;
      totalY += link.value * center;
    }
    return totalV > 0 ? totalY / totalV : 0;
  }

  function relaxToTargets(c: number) {
    for (const i of columns[c]) {
      if (inLinks[i].length === 0) continue;
      const target = weightedY(inLinks[i], 'source') - nodes[i].h / 2;
      nodes[i].y += (target - nodes[i].y) * 0.5;
    }
  }

  function relaxToSources(c: number) {
    for (const i of columns[c]) {
      if (outLinks[i].length === 0) continue;
      const target = weightedY(outLinks[i], 'target') - nodes[i].h / 2;
      nodes[i].y += (target - nodes[i].y) * 0.5;
    }
  }

  function resolveCollisions() {
    for (let c = 0; c < colCount; c++) {
      const col = columns[c].slice().sort((a, b) => nodes[a].y - nodes[b].y);
      // Push down where overlap, then push up if exceeded the bottom.
      let yy = opts.y;
      for (const i of col) {
        const dy = yy - nodes[i].y;
        if (dy > 0) nodes[i].y += dy;
        yy = nodes[i].y + nodes[i].h + nodePadding;
      }
      // Overflow correction from the bottom.
      let bottom = opts.y + opts.h;
      for (let k = col.length - 1; k >= 0; k--) {
        const i = col[k];
        const dy = nodes[i].y + nodes[i].h - bottom;
        if (dy > 0) nodes[i].y -= dy;
        bottom = nodes[i].y - nodePadding;
      }
    }
  }
}
