/**
 * Viewport culling utilities.
 *
 * Given a set of screen-space points, determine which are visible
 * within the current plot area (with configurable margin) and return
 * only the visible range, avoiding draw calls for off-screen data.
 */

export interface ViewportBounds {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
}

/**
 * Find the contiguous visible index range for sorted-by-x data.
 * Uses binary search — O(log n).
 *
 * Returns [startIndex, endIndex] inclusive, with a margin of `pad`
 * extra indices on each side to avoid clipping artifacts at edges.
 */
export function visibleRange(
  screenXs: number[],
  viewXMin: number,
  viewXMax: number,
  pad = 2,
): [number, number] {
  const n = screenXs.length;
  if (n === 0) return [0, 0];

  // Binary search for first visible
  let lo = 0, hi = n - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (screenXs[mid] < viewXMin) lo = mid + 1;
    else hi = mid;
  }
  const start = Math.max(0, lo - pad);

  // Binary search for last visible
  lo = start;
  hi = n - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (screenXs[mid] > viewXMax) hi = mid - 1;
    else lo = mid;
  }
  const end = Math.min(n - 1, hi + pad);

  return [start, end];
}

/**
 * For bar charts: find visible bar indices given bar x positions.
 */
export function visibleBarRange(
  barCount: number,
  plotX: number,
  plotW: number,
  groupWidth: number,
  scrollOffset = 0,
): [number, number] {
  const firstVisible = Math.max(0, Math.floor((scrollOffset - plotX) / groupWidth) - 1);
  const lastVisible = Math.min(barCount - 1, Math.ceil((scrollOffset + plotW - plotX) / groupWidth) + 1);
  return [firstVisible, lastVisible];
}

/**
 * Check if a single point is within the viewport.
 */
export function isVisible(
  sx: number,
  sy: number,
  bounds: ViewportBounds,
  margin = 10,
): boolean {
  return (
    sx >= bounds.xMin - margin &&
    sx <= bounds.xMax + margin &&
    sy >= bounds.yMin - margin &&
    sy <= bounds.yMax + margin
  );
}

/**
 * Filter an array of screen-space {x, y} points, returning indices
 * of those within the viewport. For unsorted data (scatter).
 */
export function filterVisible(
  sxs: number[],
  sys: number[],
  bounds: ViewportBounds,
  margin = 10,
): number[] {
  const visible: number[] = [];
  for (let i = 0; i < sxs.length; i++) {
    if (isVisible(sxs[i], sys[i], bounds, margin)) {
      visible.push(i);
    }
  }
  return visible;
}
