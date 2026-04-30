---
"@arshad-shah/swift-chart": patch
---

# Algorithmic + correctness fixes

Eight bugs identified and fixed:

- **`squarify` was O(n²)** despite the docstring claiming linear. Three
  sources: per-iteration `sumValues(remaining)` recompute,
  `remaining.slice(...)` reallocation, and `appendRow` that allocated a
  fresh array on every inner-loop step (the comment claiming
  "Allocation-free" was wrong). Rewritten to walk the input with an index
  cursor, maintain a running `remainingTotal` that's decremented after
  each row, and pass the candidate item to `worstAspect` as an extra
  parameter so it never builds `[...row, candidate]`. New regression
  test: 5000 items lay out in well under O(n²) time.

- **`layoutSankey`'s topo walk was O(n²)** because it used
  `queue.shift()` (which on a JS array is O(n) per pop). Replaced with a
  cursor (`for (let qi = 0; qi < queue.length; qi++)`), keeping the walk
  to O(nodes + links). New regression test: 1000-node chain DAG lays out
  in well under 500 ms (was multi-second on the old path).

- **`layoutSankey`'s `ky` could go negative** when the requested rect
  was shorter than the per-column padding alone required, producing
  negative node heights and broken layout bounds. Now clamps available
  height to `Math.max(0, opts.h - nodePadding × maxGaps)`. New
  regression test: 10 nodes in 50 px height with 12 px padding (108 px
  of padding total > 50 px rect) produces every node with `h ≥ 0`.

- **`lerpColor` documented "any CSS-ish colour" but only handled hex /
  `rgb()` / `rgba()`.** Named colours (`red`), `hsl()`, `oklch()`,
  `color-mix()` etc. silently fell back to black, producing wrong heatmap
  output. Added a lazily-instantiated 1×1 canvas fallback that delegates
  parsing to the host browser (which understands every CSS colour syntax
  it supports), then re-parses the canvas's normalised result through the
  fast path. SSR-safe (stays `null` outside a browser). The fast hex /
  rgb paths still allocate nothing.

- **BubbleChart hover query was hard-coded at 24 px** but bubbles can
  render up to `maxRadius` (default 40 px) — hovering on a large bubble
  whose centre was > 24 px from the cursor would silently miss. Now
  queries with `Math.max(24, maxRadius + 4)` AND verifies the cursor
  lies within the candidate's *actual* painted radius (so the hit is
  precise: only inside the visible disc, never the empty space the
  larger query window covered). Regression test asserts both halves.

- **SankeyChart re-laid-out on every draw.** `_draw` unconditionally set
  `this._layout = null`, defeating the cache in `_ensureLayout` —
  `layoutSankey` ran on every animation frame and every hover redraw.
  Now caches against `(plotArea.w, plotArea.h)` and only invalidates on
  resize, `setSankey`, or a config patch. Regression test asserts the
  cached object is reused across consecutive draws.

- **NetworkChart seeded against `this.width / this.height`** (the full
  canvas, including title and padding regions) and centred its force
  simulation there, so initial nodes could land on the title and the
  centring force pulled toward the wrong centre. Now seeds and centres
  against `this.plotArea`. Regression test asserts every seeded node
  position is within `plotArea`.

920/920 tests pass; all sizes under their respective `size-limit`
budgets (full barrel 19.79 KB brotli vs. 21 KB budget).
