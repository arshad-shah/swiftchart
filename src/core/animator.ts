import type { EasingName } from '../types';

export type EasingFn = (t: number) => number;

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

export class Animator {
  duration: number;
  easing: EasingName;
  progress: number;
  running: boolean;
  private _rafId: number | null = null;

  constructor(duration = 600, easing: EasingName = 'easeOutCubic') {
    this.duration = duration;
    this.easing = easing;
    this.progress = 0;
    this.running = false;
  }

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

  stop(): void {
    this.running = false;
    if (this._rafId !== null) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }
  }
}
