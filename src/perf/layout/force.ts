/**
 * Minimal force-directed layout for small / medium graphs.
 *
 * O(n²) per iteration — fine for the sub-300-node graphs typical in
 * documentation diagrams. For larger graphs prefer a Barnes-Hut quadtree;
 * this implementation favours small bundle size and zero allocations
 * inside the inner loop.
 */

export interface ForceNode {
  /** Stable id used to resolve link endpoints. */
  id: string;
  x: number;
  y: number;
  /** Internal velocity — written by the simulator. */
  vx: number;
  vy: number;
  /** Pinned nodes are excluded from velocity integration. */
  pinned?: boolean;
}

export interface ForceLink {
  source: number;
  target: number;
  /** Desired rest length. Defaults to `linkDistance` when omitted. */
  length?: number;
}

export interface ForceOptions {
  /** Centre point for the centring force. */
  cx: number;
  cy: number;
  /** Iteration count. Default 200. */
  iterations?: number;
  /** Spring constant. Default 0.05. */
  linkStrength?: number;
  /** Repulsion magnitude. Default 300. */
  chargeStrength?: number;
  /** Default rest length for unspecified links. Default 60. */
  linkDistance?: number;
  /** Velocity decay per step (0–1). Default 0.6. */
  velocityDecay?: number;
}

/**
 * Run a deterministic spring/charge simulation in place.
 *
 * The function mutates `nodes[i].x/y` and resets `vx/vy` to 0. Total work is
 * `O(iterations × (n² + links))`. Stable for n up to ~300 in real-time UI.
 */
export function simulateForce(
  nodes: ForceNode[],
  links: ForceLink[],
  opts: ForceOptions,
): void {
  const n = nodes.length;
  if (!n) return;
  const iters = opts.iterations ?? 200;
  const k = opts.linkStrength ?? 0.05;
  const charge = opts.chargeStrength ?? 300;
  const linkDist = opts.linkDistance ?? 60;
  const decay = opts.velocityDecay ?? 0.6;

  for (let it = 0; it < iters; it++) {
    // Repulsive (charge) force — every pair, both directions in one pass.
    for (let i = 0; i < n; i++) {
      const a = nodes[i];
      for (let j = i + 1; j < n; j++) {
        const b = nodes[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        let d2 = dx * dx + dy * dy;
        if (d2 < 1) d2 = 1;
        const f = charge / d2;
        const d = Math.sqrt(d2);
        const fx = (dx / d) * f;
        const fy = (dy / d) * f;
        a.vx += fx; a.vy += fy;
        b.vx -= fx; b.vy -= fy;
      }
      // Centring pull.
      a.vx += (opts.cx - a.x) * 0.01;
      a.vy += (opts.cy - a.y) * 0.01;
    }

    // Spring (link) force.
    for (let li = 0; li < links.length; li++) {
      const link = links[li];
      const a = nodes[link.source];
      const b = nodes[link.target];
      if (!a || !b) continue;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const d = Math.sqrt(dx * dx + dy * dy) || 1;
      const rest = link.length ?? linkDist;
      const f = (d - rest) * k;
      const fx = (dx / d) * f;
      const fy = (dy / d) * f;
      if (!a.pinned) { a.vx += fx; a.vy += fy; }
      if (!b.pinned) { b.vx -= fx; b.vy -= fy; }
    }

    // Integrate.
    for (let i = 0; i < n; i++) {
      const node = nodes[i];
      if (node.pinned) { node.vx = 0; node.vy = 0; continue; }
      node.x += node.vx;
      node.y += node.vy;
      node.vx *= decay;
      node.vy *= decay;
    }
  }
}
