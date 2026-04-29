/**
 * StreamBuffer — Append-only ring buffer for streaming/real-time data.
 *
 * Maintains a fixed-capacity buffer of the most recent N points,
 * discarding the oldest when full. Avoids re-allocating arrays on
 * every data push (which is the bottleneck in naive approaches).
 *
 * Provides O(1) append, O(1) access, and O(n) snapshot.
 */

export class StreamBuffer {
  private _buf: Float64Array;
  private _head = 0; // next write position
  private _size = 0;
  private _capacity: number;
  private _dirty = true;
  private _snapshot: number[] | null = null;

  constructor(capacity = 10_000) {
    this._capacity = capacity;
    this._buf = new Float64Array(capacity);
  }

  /** Current number of elements */
  get length(): number {
    return this._size;
  }

  get capacity(): number {
    return this._capacity;
  }

  /** Push a single value (O(1)) */
  push(value: number): void {
    this._buf[this._head] = value;
    this._head = (this._head + 1) % this._capacity;
    if (this._size < this._capacity) this._size++;
    this._dirty = true;
    this._statsDirty = true;
  }

  /** Push multiple values at once */
  pushMany(values: number[]): void {
    for (const v of values) this.push(v);
  }

  /** Get value at logical index (0 = oldest visible) */
  get(index: number): number {
    if (index < 0 || index >= this._size) return 0;
    const start = this._size < this._capacity
      ? 0
      : this._head;
    return this._buf[(start + index) % this._capacity];
  }

  /** Get all values as a plain number[] (cached until dirty) */
  toArray(): number[] {
    if (!this._dirty && this._snapshot) return this._snapshot;

    const arr = new Array(this._size);
    const start = this._size < this._capacity ? 0 : this._head;
    for (let i = 0; i < this._size; i++) {
      arr[i] = this._buf[(start + i) % this._capacity];
    }
    this._snapshot = arr;
    this._dirty = false;
    return arr;
  }

  /** Clear all data */
  clear(): void {
    this._head = 0;
    this._size = 0;
    this._dirty = true;
    this._snapshot = null;
    this._statsDirty = true;
  }

  /** Last N values */
  tail(n: number): number[] {
    n = Math.min(n, this._size);
    const start = this._size - n;
    const out = new Array(n);
    for (let i = 0; i < n; i++) out[i] = this.get(start + i);
    return out;
  }

  /** Min/max of the current buffer (O(n) but only recomputed when dirty) */
  private _cachedMin = 0;
  private _cachedMax = 0;
  private _statsDirty = true;

  minMax(): [number, number] {
    if (this._size === 0) return [0, 0];
    if (!this._statsDirty) return [this._cachedMin, this._cachedMax];

    let min = Infinity, max = -Infinity;
    const arr = this.toArray();
    for (let i = 0; i < arr.length; i++) {
      if (arr[i] < min) min = arr[i];
      if (arr[i] > max) max = arr[i];
    }
    this._cachedMin = min;
    this._cachedMax = max;
    this._statsDirty = false;
    return [min, max];
  }
}

/**
 * Multi-series streaming buffer — wraps multiple StreamBuffers
 * with shared label tracking.
 */
export class StreamDataset {
  labels: StreamLabelBuffer;
  series: Map<string, StreamBuffer>;
  private _capacity: number;

  constructor(seriesNames: string[], capacity = 10_000) {
    this._capacity = capacity;
    this.labels = new StreamLabelBuffer(capacity);
    this.series = new Map();
    for (const name of seriesNames) {
      this.series.set(name, new StreamBuffer(capacity));
    }
  }

  /** Push a single row of data */
  push(label: string, values: Record<string, number>): void {
    this.labels.push(label);
    for (const [name, buf] of this.series) {
      buf.push(values[name] ?? 0);
    }
  }

  /** Push many rows at once */
  pushMany(rows: { label: string; values: Record<string, number> }[]): void {
    for (const row of rows) this.push(row.label, row.values);
  }

  /** Get resolved data snapshot for charting */
  toResolvedData(): { labels: string[]; datasets: { label: string; data: number[] }[] } {
    return {
      labels: this.labels.toArray(),
      datasets: Array.from(this.series.entries()).map(([name, buf]) => ({
        label: name,
        data: buf.toArray(),
      })),
    };
  }

  get length(): number {
    return this.labels.length;
  }

  clear(): void {
    this.labels.clear();
    for (const buf of this.series.values()) buf.clear();
  }
}

/** Label ring buffer (string version) */
class StreamLabelBuffer {
  private _buf: string[];
  private _head = 0;
  private _size = 0;
  private _capacity: number;

  constructor(capacity: number) {
    this._capacity = capacity;
    this._buf = new Array(capacity).fill('');
  }

  get length(): number { return this._size; }

  push(label: string): void {
    this._buf[this._head] = label;
    this._head = (this._head + 1) % this._capacity;
    if (this._size < this._capacity) this._size++;
  }

  toArray(): string[] {
    const arr = new Array(this._size);
    const start = this._size < this._capacity ? 0 : this._head;
    for (let i = 0; i < this._size; i++) {
      arr[i] = this._buf[(start + i) % this._capacity];
    }
    return arr;
  }

  clear(): void {
    this._head = 0;
    this._size = 0;
  }
}
