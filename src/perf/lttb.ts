/**
 * Largest-Triangle-Three-Buckets (LTTB) downsampling.
 *
 * Reduces N data points to `target` points while preserving
 * the visual shape of the line. O(n) time, O(target) space.
 *
 * Reference: Sveinn Steinarsson, "Downsampling Time Series for
 * Visual Representation" (2013).
 */

export interface LTTBPoint {
  x: number;
  y: number;
  /** Original index in the source array */
  originalIndex: number;
}

/**
 * Downsample an array of numbers to `target` points using LTTB.
 * Returns indices into the original array.
 */
export function lttbIndices(data: number[], target: number): number[] {
  const n = data.length;
  if (n <= target || target < 3) {
    return Array.from({ length: n }, (_, i) => i);
  }

  const indices: number[] = new Array(target);
  indices[0] = 0;
  indices[target - 1] = n - 1;

  const bucketSize = (n - 2) / (target - 2);

  let prevSelected = 0;

  for (let bucket = 1; bucket < target - 1; bucket++) {
    // Bucket boundaries
    const bucketStart = Math.floor((bucket - 1) * bucketSize) + 1;
    const bucketEnd = Math.min(Math.floor(bucket * bucketSize) + 1, n - 1);

    // Next bucket average (for triangle area computation)
    const nextBucketStart = Math.floor(bucket * bucketSize) + 1;
    const nextBucketEnd = Math.min(Math.floor((bucket + 1) * bucketSize) + 1, n - 1);

    let avgX = 0;
    let avgY = 0;
    let nextCount = 0;
    for (let i = nextBucketStart; i < nextBucketEnd; i++) {
      avgX += i;
      avgY += data[i];
      nextCount++;
    }
    if (nextCount > 0) {
      avgX /= nextCount;
      avgY /= nextCount;
    }

    // Find the point in current bucket that forms the largest triangle
    // with the previously selected point and the next bucket average
    const prevX = prevSelected;
    const prevY = data[prevSelected];

    let maxArea = -1;
    let bestIdx = bucketStart;

    for (let i = bucketStart; i < bucketEnd; i++) {
      // Triangle area (2x to avoid division)
      const area = Math.abs(
        (prevX - avgX) * (data[i] - prevY) -
        (prevX - i) * (avgY - prevY)
      );
      if (area > maxArea) {
        maxArea = area;
        bestIdx = i;
      }
    }

    indices[bucket] = bestIdx;
    prevSelected = bestIdx;
  }

  return indices;
}

/**
 * Downsample a number array to `target` points, returning the
 * downsampled values and their original indices.
 */
export function lttbDownsample(data: number[], target: number): LTTBPoint[] {
  const indices = lttbIndices(data, target);
  return indices.map(i => ({ x: i, y: data[i], originalIndex: i }));
}

/**
 * Downsample XY point arrays for scatter/line charts.
 */
export function lttbDownsampleXY(
  xs: number[],
  ys: number[],
  target: number,
): { xs: number[]; ys: number[]; indices: number[] } {
  const n = xs.length;
  if (n <= target || target < 3) {
    return {
      xs: [...xs],
      ys: [...ys],
      indices: Array.from({ length: n }, (_, i) => i),
    };
  }

  const indices: number[] = new Array(target);
  indices[0] = 0;
  indices[target - 1] = n - 1;

  const bucketSize = (n - 2) / (target - 2);
  let prevSelected = 0;

  for (let bucket = 1; bucket < target - 1; bucket++) {
    const bucketStart = Math.floor((bucket - 1) * bucketSize) + 1;
    const bucketEnd = Math.min(Math.floor(bucket * bucketSize) + 1, n - 1);

    const nextBucketStart = Math.floor(bucket * bucketSize) + 1;
    const nextBucketEnd = Math.min(Math.floor((bucket + 1) * bucketSize) + 1, n - 1);

    let avgX = 0, avgY = 0, count = 0;
    for (let i = nextBucketStart; i < nextBucketEnd; i++) {
      avgX += xs[i];
      avgY += ys[i];
      count++;
    }
    if (count > 0) { avgX /= count; avgY /= count; }

    const pX = xs[prevSelected];
    const pY = ys[prevSelected];

    let maxArea = -1, bestIdx = bucketStart;
    for (let i = bucketStart; i < bucketEnd; i++) {
      const area = Math.abs(
        (pX - avgX) * (ys[i] - pY) - (pX - xs[i]) * (avgY - pY)
      );
      if (area > maxArea) { maxArea = area; bestIdx = i; }
    }

    indices[bucket] = bestIdx;
    prevSelected = bestIdx;
  }

  return {
    xs: indices.map(i => xs[i]),
    ys: indices.map(i => ys[i]),
    indices,
  };
}

/**
 * Auto-choose target bucket count based on chart pixel width.
 * Default: 2 points per pixel (retina-safe).
 */
export function autoTarget(dataLength: number, chartPixelWidth: number, ppx = 2): number {
  const maxPoints = Math.max(3, Math.floor(chartPixelWidth * ppx));
  return dataLength <= maxPoints ? dataLength : maxPoints;
}
