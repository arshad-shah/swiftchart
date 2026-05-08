import type { EasingName } from '../types';

/**
 * Easing function: maps a normalised time `t ∈ [0,1]` to an eased
 * progress value, also typically in `[0,1]` (some easings overshoot
 * by design — `easeOutBack`, `easeOutElastic`).
 */
export type EasingFn = (t: number) => number;

/**
 * The five built-in easing curves keyed by their {@link EasingName}.
 * Used internally by {@link Animator} and exposed for consumers that
 * want to drive their own `requestAnimationFrame` loops with the same
 * curves SwiftChart itself uses.
 *
 * @example
 * ```ts
 * import { EASINGS } from '@arshad-shah/swift-chart';
 * const eased = EASINGS.easeOutCubic(0.5); // ≈ 0.875
 * ```
 */
export const EASINGS: Record<EasingName, EasingFn> = {
  linear: t => t,
  easeOutCubic: t => 1 - Math.pow(1 - t, 3),
  easeOutElastic: t => {
    if (t === 0 || t === 1) return t;
    return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1;
  },
  easeInOutQuart: t =>
    t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2,
  easeOutBack: t => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  },
};

/**
 * Lightweight `requestAnimationFrame` driver used by every chart for
 * entry transitions. Owns a single live frame at a time, exposes the
 * current `progress` (0 → 1) and `running` flag, and applies the chart's
 * configured easing curve before invoking the per-frame callback.
 *
 * Charts call `animator.start(onFrame, onDone?)` from their internal
 * `_animate()`; `stop()` cancels mid-flight (used during `destroy()` and
 * before re-starting).
 */
export class Animator {
  /** Animation duration in milliseconds. Mutate to adjust on the fly. */
  duration: number;
  /** Active easing curve name. Mutate to switch curves. */
  easing: EasingName;
  /** Current raw (un-eased) progress, between 0 and 1. */
  progress: number;
  /** True while `start` is driving frames. Resets to false on completion or `stop`. */
  running: boolean;
  private _rafId: number | null = null;

  /**
   * @param duration  Animation length in ms (default 600).
   * @param easing    Easing curve name; falls back to `easeOutCubic` if unknown.
   */
  constructor(duration = 600, easing: EasingName = 'easeOutCubic') {
    this.duration = duration;
    this.easing = easing;
    this.progress = 0;
    this.running = false;
  }

  /**
   * Begin a new animation. Cancels any prior frame.
   *
   * @param onFrame  Called every frame with the *eased* progress in `[0,1]`
   *                 (or slightly outside for overshoot easings).
   * @param onDone   Optional callback fired once when the animation reaches 1.
   */
  start(onFrame: (progress: number) => void, onDone?: () => void): void {
    this.stop();
    this.running = true;
    this.progress = 0;
    const startTime = performance.now();
    const ease = EASINGS[this.easing] || EASINGS.easeOutCubic;

    const tick = (now: number) => {
      if (!this.running) return;
      const elapsed = now - startTime;
      this.progress = Math.min(elapsed / this.duration, 1);
      onFrame(ease(this.progress));
      if (this.progress < 1) {
        this._rafId = requestAnimationFrame(tick);
      } else {
        this.running = false;
        onDone?.();
      }
    };

    this._rafId = requestAnimationFrame(tick);
  }

  /** Cancel the current animation, if any. Safe to call when idle. */
  stop(): void {
    this.running = false;
    if (this._rafId !== null) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }
  }
}
