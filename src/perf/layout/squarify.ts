/**
 * Squarified treemap layout (Bruls, Huijsen & van Wijk, 2000).
 *
 * Produces axis-aligned rectangles whose areas are proportional to the
 * input values, optimising the per-rectangle aspect ratio so cells stay
 * close to square.
 *
 * Implementation notes (this file used to be O(n²)):
 *
 *   - The input array is *not* copied or sliced. We walk it with an index
 *     cursor (`start`), so we never reallocate the tail of the array.
 *   - `remainingTotal` is maintained as a running counter; we subtract
 *     `rowSum` after each row instead of re-summing the leftover items.
 *   - The "would adding this candidate worsen the worst aspect ratio?"
 *     test never builds a `[...row, candidate]` array. `worstAspect`
 *     accepts the candidate as an extra parameter and folds it into the
 *     loop, so the inner per-iteration work allocates nothing.
 *
 * Worst-case complexity is now `O(Σ row.length)` for the aspect-ratio
 * checks (each item is visited once per row it sits in, plus once when
 * the row is committed) — i.e. close to linear for typical inputs and
 * never worse than O(n × maxRowLength) which is bounded by the number
 * of items per row.
 */

export interface SquarifyItem {
  label: string;
  value: number;
}

export interface SquarifiedRect extends SquarifyItem {
  /** Pixel rectangle. */
  rx: number;
  ry: number;
  rw: number;
  rh: number;
}

export interface SquarifyRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Pack `items` into `rect` so each rectangle's area ≈ value × area / total.
 * Items must be sorted descending by value for the squarified algorithm to
 * achieve its aspect-ratio guarantees; this function does NOT sort, callers
 * should pre-sort.
 */
export function squarify(items: SquarifyItem[], rect: SquarifyRect): SquarifiedRect[] {
  const n = items.length;
  if (!n) return [];
  const out: SquarifiedRect[] = [];

  let { x, y, w, h } = rect;
  let start = 0;             // index of the next un-placed item
  // Running sum of un-placed item values. We compute it once up front and
  // decrement by `rowSum` after each committed row.
  let remainingTotal = 0;
  for (let i = 0; i < n; i++) remainingTotal += items[i].value;

  while (start < n) {
    if (remainingTotal <= 0) break;

    const isWide = w >= h;
    const side = Math.max(0.0001, isWide ? h : w);

    // Greedily extend the current row [start .. end) — `rowLen` counts
    // items in the row; `rowSum` is their value sum. We only need the
    // length, not the items, because `worstAspect` re-walks `items` from
    // `start` for `rowLen` iterations.
    let rowLen = 1;
    let rowSum = items[start].value;

    for (let i = start + 1; i < n; i++) {
      const candidate = items[i];
      const worstNow = worstAspect(items, start, rowLen, rowSum, undefined, side, remainingTotal);
      const worstNext = worstAspect(
        items, start, rowLen, rowSum, candidate, side, remainingTotal,
      );
      if (worstNext < worstNow) {
        rowLen += 1;
        rowSum += candidate.value;
      } else break;
    }

    const rowFrac = rowSum / remainingTotal;
    const rowSize = isWide ? w * rowFrac : h * rowFrac;
    let offset = 0;

    for (let k = 0; k < rowLen; k++) {
      const item = items[start + k];
      const itemFrac = item.value / rowSum;
      const itemSize = side * itemFrac;
      if (isWide) {
        out.push({ ...item, rx: x, ry: y + offset, rw: rowSize, rh: itemSize });
      } else {
        out.push({ ...item, rx: x + offset, ry: y, rw: itemSize, rh: rowSize });
      }
      offset += itemSize;
    }

    start += rowLen;
    remainingTotal -= rowSum;
    if (isWide) { x += rowSize; w -= rowSize; }
    else { y += rowSize; h -= rowSize; }
  }
  return out;
}

/**
 * Worst aspect ratio of the row `items[start .. start+rowLen)`, optionally
 * extended by `extra`. Allocates nothing.
 */
function worstAspect(
  items: SquarifyItem[],
  start: number,
  rowLen: number,
  rowSum: number,
  extra: SquarifyItem | undefined,
  side: number,
  total: number,
): number {
  if (total === 0 || rowSum === 0) return Infinity;
  const effSum = extra ? rowSum + extra.value : rowSum;
  const s2 = (side * effSum / total) ** 2;
  let maxR = 0;

  for (let i = 0; i < rowLen; i++) {
    const v = items[start + i].value;
    const frac = side * (v / total);
    if (frac === 0 || s2 === 0) continue;
    const r = s2 > frac * frac ? s2 / (frac * frac) : (frac * frac) / s2;
    if (r > maxR) maxR = r;
  }
  if (extra) {
    const frac = side * (extra.value / total);
    if (frac !== 0 && s2 !== 0) {
      const r = s2 > frac * frac ? s2 / (frac * frac) : (frac * frac) / s2;
      if (r > maxR) maxR = r;
    }
  }
  return maxR;
}
