import { describe, it, expect, beforeEach } from 'vitest';
import React, { useState } from 'react';
import { render, cleanup, act, fireEvent } from '@testing-library/react';
import { Line, Sankey } from '../../src/react';
import { LineChart } from '../../src/charts/line';
import { MockResizeObserver } from '../setup';

// Wait for effects + microtasks (rAF mock resolves on a microtask).
async function settle() {
  await act(async () => {
    await new Promise(r => setTimeout(r, 50));
  });
}

beforeEach(() => { cleanup(); });

describe('issue #25 — React adapter fixes', () => {
  it('setData fires for circular mapping (no false-equality on stringify error)', async () => {
    // Two distinct circular mappings should both register as "changed",
    // not collapse to the same '' key.
    const a: any = { x: 'm', y: 'r' }; a.self = a;
    const b: any = { x: 'm', y: 'cost' }; b.self = b;

    let setDataCount = 0;
    const origSetData = LineChart.prototype.setData;
    LineChart.prototype.setData = function (...args) {
      setDataCount++;
      return origSetData.apply(this, args as any);
    };

    try {
      const data = [{ m: 'Jan', r: 1, cost: 2 }];
      const { rerender } = render(
        <Line data={data} mapping={a} animate={false} width={400} height={200} />
      );
      await settle();
      const initial = setDataCount;
      expect(initial).toBeGreaterThan(0);

      rerender(
        <Line data={data} mapping={b} animate={false} width={400} height={200} />
      );
      await settle();
      expect(setDataCount).toBeGreaterThan(initial);
    } finally {
      LineChart.prototype.setData = origSetData;
    }
  });

  it('does not stringify large mapping fields per render (Sankey nodes/links by reference)', async () => {
    // Wrap JSON.stringify and assert it is NOT called with the giant graph.
    const big = {
      nodes: Array.from({ length: 500 }, (_, i) => ({ id: `n${i}`, label: `Node ${i}` })),
      links: Array.from({ length: 1000 }, (_, i) => ({
        source: `n${i % 500}`, target: `n${(i + 1) % 500}`, value: i,
      })),
    };

    const orig = JSON.stringify;
    let sawHugeStringify = false;
    (JSON as any).stringify = function (v: any, ...rest: any[]) {
      // Heuristic: a stringify whose first arg contains the graph would
      // include 'n499'. The hot per-render path must not do that.
      try {
        if (v && typeof v === 'object' && (v.nodes || v.links)) sawHugeStringify = true;
      } catch { /* ignore */ }
      return orig.call(JSON, v, ...rest);
    };

    function Harness() {
      const [, force] = useState(0);
      return (
        <>
          <button onClick={() => force(n => n + 1)}>bump</button>
          <Sankey
            nodes={big.nodes as any}
            links={big.links as any}
            animate={false}
            width={400}
            height={200}
          />
        </>
      );
    }

    try {
      const { getByText } = render(<Harness />);
      await settle();
      sawHugeStringify = false; // reset; we only care about post-mount renders
      // Force several re-renders; the hot path must not stringify the graph.
      for (let i = 0; i < 5; i++) {
        fireEvent.click(getByText('bump'));
        await settle();
      }
      expect(sawHugeStringify).toBe(false);
    } finally {
      (JSON as any).stringify = orig;
    }
  });

  it('shallow-equal mapping literals do not retrigger setData', async () => {
    let setDataCount = 0;
    const origSetData = LineChart.prototype.setData;
    LineChart.prototype.setData = function (...args) {
      setDataCount++;
      return origSetData.apply(this, args as any);
    };

    try {
      const data = [{ m: 'Jan', r: 1 }, { m: 'Feb', r: 2 }];
      function Harness({ tick }: { tick: number }) {
        // New object literal each render — same shallow content.
        return (
          <Line
            data={data}
            mapping={{ x: 'm', y: 'r' }}
            animate={false}
            width={400}
            height={200}
            // tick goes nowhere — just forces parent re-render
            ariaLabel={`t-${tick}`}
          />
        );
      }
      const { rerender } = render(<Harness tick={0} />);
      await settle();
      const after = setDataCount;
      // Re-render with a fresh literal having identical content.
      rerender(<Harness tick={0} />);
      await settle();
      // setData must NOT have fired again on shallow-equal mapping.
      expect(setDataCount).toBe(after);
    } finally {
      LineChart.prototype.setData = origSetData;
    }
  });
});

describe('issue #25 — resize path fixes', () => {
  it('coalesces bursty ResizeObserver fires into a single redraw via rAF', async () => {
    let drawCount = 0;
    const orig = (LineChart.prototype as any)._draw;
    (LineChart.prototype as any)._draw = function (...args: any[]) {
      drawCount++;
      return orig.apply(this, args);
    };

    try {
      render(
        <Line
          data={[{ m: 'Jan', r: 1 }]}
          mapping={{ x: 'm', y: 'r' }}
          animate={false}
          width={400}
          height={200}
        />
      );
      await settle();
      const baseline = drawCount;
      const ro = MockResizeObserver.instances[MockResizeObserver.instances.length - 1];
      expect(ro).toBeTruthy();

      // Burst of 5 observer fires before the rAF resolves.
      ro.trigger();
      ro.trigger();
      ro.trigger();
      ro.trigger();
      ro.trigger();

      await settle();
      // At most one extra _draw should have happened from the burst (and
      // because dimensions didn't change, possibly zero — the rAF callback
      // bails when the rect hasn't changed).
      expect(drawCount - baseline).toBeLessThanOrEqual(1);
    } finally {
      (LineChart.prototype as any)._draw = orig;
    }
  });
});
