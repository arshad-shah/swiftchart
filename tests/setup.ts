import { vi, beforeEach, afterEach } from 'vitest';

// ── Canvas 2D Mock ─────────────────────────────────────
class MockCanvasRenderingContext2D {
  canvas: HTMLCanvasElement;

  // State tracking for assertions
  fillStyle = '#000000';
  strokeStyle = '#000000';
  lineWidth = 1;
  lineCap: CanvasLineCap = 'butt';
  lineJoin: CanvasLineJoin = 'miter';
  font = '10px sans-serif';
  textAlign: CanvasTextAlign = 'start';
  textBaseline: CanvasTextBaseline = 'alphabetic';
  globalAlpha = 1;
  shadowColor = 'rgba(0, 0, 0, 0)';
  shadowBlur = 0;
  shadowOffsetX = 0;
  shadowOffsetY = 0;

  // Call tracking
  calls: { method: string; args: any[] }[] = [];

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
  }

  private _track(method: string, args: any[] = []) {
    this.calls.push({ method, args: [...args] });
  }

  // Path methods
  beginPath() { this._track('beginPath'); }
  closePath() { this._track('closePath'); }
  moveTo(x: number, y: number) { this._track('moveTo', [x, y]); }
  lineTo(x: number, y: number) { this._track('lineTo', [x, y]); }
  arc(x: number, y: number, r: number, s: number, e: number, ccw?: boolean) {
    this._track('arc', [x, y, r, s, e, ccw]);
  }
  arcTo(x1: number, y1: number, x2: number, y2: number, r: number) {
    this._track('arcTo', [x1, y1, x2, y2, r]);
  }
  bezierCurveTo(cp1x: number, cp1y: number, cp2x: number, cp2y: number, x: number, y: number) {
    this._track('bezierCurveTo', [cp1x, cp1y, cp2x, cp2y, x, y]);
  }
  quadraticCurveTo(cpx: number, cpy: number, x: number, y: number) {
    this._track('quadraticCurveTo', [cpx, cpy, x, y]);
  }
  rect(x: number, y: number, w: number, h: number) {
    this._track('rect', [x, y, w, h]);
  }
  roundRect(x: number, y: number, w: number, h: number, radii?: number | number[]) {
    this._track('roundRect', [x, y, w, h, radii]);
  }
  ellipse(x: number, y: number, rx: number, ry: number, rot: number, s: number, e: number, ccw?: boolean) {
    this._track('ellipse', [x, y, rx, ry, rot, s, e, ccw]);
  }

  // Draw methods
  fill(fillRule?: CanvasFillRule) { this._track('fill', [fillRule]); }
  stroke() { this._track('stroke'); }
  fillRect(x: number, y: number, w: number, h: number) {
    this._track('fillRect', [x, y, w, h]);
  }
  strokeRect(x: number, y: number, w: number, h: number) {
    this._track('strokeRect', [x, y, w, h]);
  }
  clearRect(x: number, y: number, w: number, h: number) {
    this._track('clearRect', [x, y, w, h]);
  }
  fillText(text: string, x: number, y: number, maxWidth?: number) {
    this._track('fillText', [text, x, y, maxWidth]);
  }
  strokeText(text: string, x: number, y: number, maxWidth?: number) {
    this._track('strokeText', [text, x, y, maxWidth]);
  }

  // State
  save() { this._track('save'); }
  restore() { this._track('restore'); }
  clip(fillRule?: CanvasFillRule) { this._track('clip', [fillRule]); }
  setTransform(a: number, b: number, c: number, d: number, e: number, f: number) {
    this._track('setTransform', [a, b, c, d, e, f]);
  }
  resetTransform() { this._track('resetTransform'); }
  translate(x: number, y: number) { this._track('translate', [x, y]); }
  rotate(angle: number) { this._track('rotate', [angle]); }
  scale(x: number, y: number) { this._track('scale', [x, y]); }
  transform(a: number, b: number, c: number, d: number, e: number, f: number) {
    this._track('transform', [a, b, c, d, e, f]);
  }
  getTransform() { return { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 } as DOMMatrix; }

  // Line dash
  setLineDash(segments: number[]) { this._track('setLineDash', [segments]); }
  getLineDash() { return []; }

  // Gradient / Pattern
  createLinearGradient(x0: number, y0: number, x1: number, y1: number) {
    this._track('createLinearGradient', [x0, y0, x1, y1]);
    return { addColorStop: vi.fn() };
  }
  createRadialGradient(x0: number, y0: number, r0: number, x1: number, y1: number, r1: number) {
    this._track('createRadialGradient', [x0, y0, r0, x1, y1, r1]);
    return { addColorStop: vi.fn() };
  }
  createPattern() { return null; }
  createConicGradient() { return { addColorStop: vi.fn() }; }

  // Measurement
  measureText(text: string) {
    return {
      width: text.length * 7,
      actualBoundingBoxAscent: 8,
      actualBoundingBoxDescent: 2,
      fontBoundingBoxAscent: 10,
      fontBoundingBoxDescent: 3,
    };
  }

  // Image
  drawImage() { this._track('drawImage'); }
  getImageData(sx: number, sy: number, sw: number, sh: number) {
    return { data: new Uint8ClampedArray(sw * sh * 4), width: sw, height: sh };
  }
  putImageData() { this._track('putImageData'); }
  createImageData(w: number, h: number) {
    return { data: new Uint8ClampedArray(w * h * 4), width: w, height: h };
  }

  // Compositing
  globalCompositeOperation = 'source-over';

  // Path2D
  isPointInPath() { return false; }
  isPointInStroke() { return false; }

  // Helper for tests
  getCallsFor(method: string) {
    return this.calls.filter(c => c.method === method);
  }
  getLastCall(method: string) {
    const calls = this.getCallsFor(method);
    return calls.length ? calls[calls.length - 1] : null;
  }
  resetCalls() { this.calls = []; }
}

// Patch HTMLCanvasElement
HTMLCanvasElement.prototype.getContext = function (contextId: string) {
  if (contextId === '2d') {
    if (!(this as any).__mockCtx) {
      (this as any).__mockCtx = new MockCanvasRenderingContext2D(this);
    }
    return (this as any).__mockCtx;
  }
  return null;
} as any;

HTMLCanvasElement.prototype.toDataURL = function () {
  return 'data:image/png;base64,mock';
};

HTMLCanvasElement.prototype.toBlob = function (cb: any) {
  cb(new Blob(['mock'], { type: 'image/png' }));
};

// ── ResizeObserver Mock ────────────────────────────────
class MockResizeObserver {
  callback: ResizeObserverCallback;
  elements: Set<Element> = new Set();

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
    MockResizeObserver.instances.push(this);
  }

  observe(el: Element) { this.elements.add(el); }
  unobserve(el: Element) { this.elements.delete(el); }
  disconnect() { this.elements.clear(); }

  // For tests — trigger a resize
  trigger(entries?: any[]) {
    this.callback(entries || [], this as any);
  }

  static instances: MockResizeObserver[] = [];
  static reset() { MockResizeObserver.instances = []; }
}

(globalThis as any).ResizeObserver = MockResizeObserver;

// ── requestAnimationFrame mock ─────────────────────────
let rafId = 0;
const rafCallbacks = new Map<number, FrameRequestCallback>();

(globalThis as any).requestAnimationFrame = (cb: FrameRequestCallback): number => {
  const id = ++rafId;
  rafCallbacks.set(id, cb);
  // Execute synchronously in tests for deterministic behaviour
  Promise.resolve().then(() => {
    if (rafCallbacks.has(id)) {
      rafCallbacks.delete(id);
      cb(performance.now());
    }
  });
  return id;
};

(globalThis as any).cancelAnimationFrame = (id: number) => {
  rafCallbacks.delete(id);
};

// ── performance.now polyfill ───────────────────────────
if (!globalThis.performance) {
  (globalThis as any).performance = { now: () => Date.now() };
}

// ── devicePixelRatio ───────────────────────────────────
Object.defineProperty(globalThis, 'devicePixelRatio', {
  value: 1,
  writable: true,
  configurable: true,
});

// ── getBoundingClientRect helper ───────────────────────
Element.prototype.getBoundingClientRect = function () {
  return {
    x: 0, y: 0, top: 0, left: 0, bottom: 400, right: 600,
    width: 600, height: 400,
    toJSON() { return this; },
  } as DOMRect;
};

// ── Global cleanup ─────────────────────────────────────
beforeEach(() => {
  MockResizeObserver.reset();
  rafCallbacks.clear();
  rafId = 0;
});

afterEach(() => {
  document.body.innerHTML = '';
});

// Export for test usage
export { MockCanvasRenderingContext2D, MockResizeObserver };
