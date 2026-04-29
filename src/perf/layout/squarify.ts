/**
 * Squarified treemap layout (Bruls, Huijsen & van Wijk, 2000).
 *
 * Produces axis-aligned rectangles whose areas are proportional to the
 * input values, optimising the per-rectangle aspect ratio so cells stay
 * close to square. Linear in input size — each item is enqueued, packed
 * into a row, and dequeued exactly once.
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
  if (!items.length) return [];
  const out: SquarifiedRect[] = [];
  let remaining = items.slice();
  let { x, y, w, h } = rect;

  while (remaining.length) {
    // Squarify recurses into the leftover sub-rectangle, so each step
    // normalises against what's still to place.
    const remainingTotal = sumValues(remaining);
    if (remainingTotal <= 0) break;

    const isWide = w >= h;
    const side = Math.max(0.0001, isWide ? h : w);

    // Greedily extend the current row until adding another item would
    // worsen the worst aspect ratio in the row.
    const row: SquarifyItem[] = [remaining[0]];
    let rowSum = remaining[0].value;

    for (let i = 1; i < remaining.length; i++) {
      const candidate = remaining[i];
      const worstNow = worstAspect(row, rowSum, side, remainingTotal);
      const worstNext = worstAspect(
        appendRow(row, candidate),
        rowSum + candidate.value,
        side,
        remainingTotal,
      );
      if (worstNext < worstNow) {
        row.push(candidate);
        rowSum += candidate.value;
      } else break;
    }

    const rowFrac = rowSum / remainingTotal;
    const rowSize = isWide ? w * rowFrac : h * rowFrac;
    let offset = 0;

    for (const item of row) {
      const itemFrac = item.value / rowSum;
      const itemSize = side * itemFrac;
      if (isWide) {
        out.push({ ...item, rx: x, ry: y + offset, rw: rowSize, rh: itemSize });
      } else {
        out.push({ ...item, rx: x + offset, ry: y, rw: itemSize, rh: rowSize });
      }
      offset += itemSize;
    }

    remaining = remaining.slice(row.length);
    if (isWide) { x += rowSize; w -= rowSize; }
    else { y += rowSize; h -= rowSize; }
  }
  return out;
}

function sumValues(arr: SquarifyItem[]): number {
  let s = 0;
  for (let i = 0; i < arr.length; i++) s += arr[i].value;
  return s;
}

/** Allocation-free row append for the candidate test (only used for ratio math). */
function appendRow(row: SquarifyItem[], extra: SquarifyItem): SquarifyItem[] {
  const out = new Array<SquarifyItem>(row.length + 1);
  for (let i = 0; i < row.length; i++) out[i] = row[i];
  out[row.length] = extra;
  return out;
}

function worstAspect(row: SquarifyItem[], rowSum: number, side: number, total: number): number {
  if (total === 0 || rowSum === 0) return Infinity;
  const s2 = (side * rowSum / total) ** 2;
  let maxR = 0;
  for (let i = 0; i < row.length; i++) {
    const item = row[i];
    const frac = side * (item.value / total);
    if (frac === 0 || s2 === 0) continue;
    const r = Math.max(s2 / (frac * frac), (frac * frac) / s2);
    if (r > maxR) maxR = r;
  }
  return maxR;
}
