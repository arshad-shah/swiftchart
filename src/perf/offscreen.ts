/**
 * OffscreenCanvas renderer — moves heavy draw work off the main thread.
 *
 * Strategy: render the static chart elements (grid, axes, data paths)
 * in a worker, then composite the result onto the visible canvas.
 * Hover/tooltip overlays still render on the main thread for
 * low-latency interaction.
 *
 * Falls back to main-thread rendering when OffscreenCanvas is
 * unavailable (Safari <16.4, older browsers).
 */

export interface OffscreenRenderRequest {
  type: 'render';
  width: number;
  height: number;
  dpr: number;
  /** Serialised draw commands */
  commands: DrawCommand[];
}

export interface OffscreenRenderResult {
  type: 'rendered';
  bitmap: ImageBitmap;
}

export type DrawCommand =
  | { op: 'fillRect'; args: [string, number, number, number, number] }
  | { op: 'strokeLine'; args: [string, number, number[], number[]] }
  | { op: 'fillArc'; args: [string, number, number, number] }
  | { op: 'fillText'; args: [string, string, string, number, number, string, string] }
  | { op: 'path'; args: PathSegment[] }
  | { op: 'fillPath'; args: [string, PathSegment[]] }
  | { op: 'strokePath'; args: [string, number, PathSegment[]] };

export type PathSegment =
  | { t: 'M'; x: number; y: number }
  | { t: 'L'; x: number; y: number }
  | { t: 'C'; cp1x: number; cp1y: number; cp2x: number; cp2y: number; x: number; y: number }
  | { t: 'Z' };

/**
 * Check if OffscreenCanvas + transferToImageBitmap is available.
 */
export function supportsOffscreen(): boolean {
  if (typeof OffscreenCanvas === 'undefined') return false;
  try {
    const oc = new OffscreenCanvas(1, 1);
    const ctx = oc.getContext('2d');
    return ctx !== null && typeof oc.transferToImageBitmap === 'function';
  } catch {
    return false;
  }
}

/**
 * Execute draw commands on a 2D context (works on both
 * OffscreenCanvas and regular Canvas).
 */
export function executeCommands(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  commands: DrawCommand[],
): void {
  for (const cmd of commands) {
    switch (cmd.op) {
      case 'fillRect': {
        const [color, x, y, w, h] = cmd.args;
        ctx.fillStyle = color;
        ctx.fillRect(x, y, w, h);
        break;
      }
      case 'strokeLine': {
        const [color, lineWidth, xs, ys] = cmd.args;
        ctx.strokeStyle = color;
        ctx.lineWidth = lineWidth;
        ctx.beginPath();
        for (let i = 0; i < xs.length; i++) {
          if (i === 0) ctx.moveTo(xs[i], ys[i]); else ctx.lineTo(xs[i], ys[i]);
        }
        ctx.stroke();
        break;
      }
      case 'fillArc': {
        const [color, cx, cy, r] = cmd.args;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case 'fillText': {
        const [color, font, text, x, y, align, baseline] = cmd.args;
        ctx.fillStyle = color;
        ctx.font = font;
        ctx.textAlign = align as CanvasTextAlign;
        ctx.textBaseline = baseline as CanvasTextBaseline;
        ctx.fillText(text, x, y);
        break;
      }
      case 'strokePath': {
        const [color, lineWidth, segments] = cmd.args;
        ctx.strokeStyle = color;
        ctx.lineWidth = lineWidth;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        _drawPath(ctx, segments);
        ctx.stroke();
        break;
      }
      case 'fillPath': {
        const [color, segments] = cmd.args;
        ctx.fillStyle = color;
        _drawPath(ctx, segments);
        ctx.fill();
        break;
      }
      case 'path': {
        // Build path without fill/stroke (caller handles styling).
        _drawPath(ctx, cmd.args);
        break;
      }
    }
  }
}

function _drawPath(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  segments: PathSegment[],
): void {
  ctx.beginPath();
  for (const seg of segments) {
    switch (seg.t) {
      case 'M': ctx.moveTo(seg.x, seg.y); break;
      case 'L': ctx.lineTo(seg.x, seg.y); break;
      case 'C': ctx.bezierCurveTo(seg.cp1x, seg.cp1y, seg.cp2x, seg.cp2y, seg.x, seg.y); break;
      case 'Z': ctx.closePath(); break;
    }
  }
}

/**
 * OffscreenRenderer — manages a background OffscreenCanvas
 * and composites rendered bitmaps onto the visible canvas.
 */
export class OffscreenRenderer {
  private _oc: OffscreenCanvas | null = null;
  private _octx: OffscreenCanvasRenderingContext2D | null = null;
  private _enabled: boolean;

  constructor() {
    this._enabled = supportsOffscreen();
  }

  get enabled(): boolean {
    return this._enabled;
  }

  /**
   * Render commands off-screen and return an ImageBitmap.
   * Falls back to null if not supported.
   */
  render(
    width: number,
    height: number,
    dpr: number,
    commands: DrawCommand[],
  ): ImageBitmap | null {
    if (!this._enabled) return null;

    try {
      const pw = Math.ceil(width * dpr);
      const ph = Math.ceil(height * dpr);

      if (!this._oc || this._oc.width !== pw || this._oc.height !== ph) {
        this._oc = new OffscreenCanvas(pw, ph);
        this._octx = this._oc.getContext('2d')!;
      }

      const ctx = this._octx!;
      ctx.clearRect(0, 0, pw, ph);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      executeCommands(ctx, commands);

      return this._oc.transferToImageBitmap();
    } catch {
      this._enabled = false;
      return null;
    }
  }

  /**
   * Composite a pre-rendered bitmap onto a visible canvas context.
   */
  composite(
    ctx: CanvasRenderingContext2D,
    bitmap: ImageBitmap,
    width: number,
    height: number,
  ): void {
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(bitmap, 0, 0, width, height);
    ctx.restore();
    bitmap.close();
  }

  destroy(): void {
    this._oc = null;
    this._octx = null;
  }
}
