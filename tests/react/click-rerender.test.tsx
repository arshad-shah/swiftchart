import { describe, it, expect, beforeEach } from 'vitest';
import React, { useState, useCallback } from 'react';
import { render, cleanup, act, fireEvent } from '@testing-library/react';
import { Line, Bar, StackedBar, Heatmap, Combo } from '../../src/react';
import { LineChart } from '../../src/charts/line';
import { BarChart } from '../../src/charts/bar';
import { StackedBarChart } from '../../src/charts/stacked-bar';
import { HeatmapChart } from '../../src/charts/heatmap';
import { ComboChart } from '../../src/charts/combo';

async function settle() {
  await act(async () => { await new Promise(r => setTimeout(r, 50)); });
}

beforeEach(() => { cleanup(); });

describe('clicking a chart should not trigger a rerender of the chart itself', () => {
  it('inline mapping={{ y: [...] }} array literal does not bump the mapping key', async () => {
    let setDataCount = 0;
    const orig = LineChart.prototype.setData;
    LineChart.prototype.setData = function (...a) { setDataCount++; return orig.apply(this, a as any); };

    try {
      const data = [{ m: 'Jan', r: 1, c: 2 }, { m: 'Feb', r: 3, c: 4 }];
      function App() {
        const [, force] = useState(0);
        return (
          <>
            <button onClick={() => force(n => n + 1)}>bump</button>
            <Line
              data={data}
              // Inline literal — fresh `y` array reference every render.
              mapping={{ x: 'm', y: ['r', 'c'] }}
              animate={false}
              width={400}
              height={200}
            />
          </>
        );
      }

      const { getByText } = render(<App />);
      await settle();
      const after = setDataCount;

      for (let i = 0; i < 4; i++) {
        fireEvent.click(getByText('bump'));
        await settle();
      }
      expect(setDataCount).toBe(after);
    } finally {
      LineChart.prototype.setData = orig;
    }
  });

  // Audit: parent re-renders triggered by an unrelated click handler
  // must not re-fire setData on charts that pass typical inline-literal
  // mappings. Each case mirrors a pattern from the playground.
  const cases: { name: string; Comp: any; Cls: any; props: any }[] = [
    {
      name: 'Bar with inline colorMap',
      Comp: Bar, Cls: BarChart,
      props: {
        data: [
          { month: 'Jan', revenue: 1, status: 'ok' },
          { month: 'Feb', revenue: 2, status: 'warn' },
        ],
        mapping: {
          x: 'month', y: 'revenue', colorField: 'status',
          colorMap: { ok: '#22c55e', warn: '#f59e0b', err: '#ef4444' },
        },
      },
    },
    {
      name: 'StackedBar with inline y-array',
      Comp: StackedBar, Cls: StackedBarChart,
      props: {
        data: [{ m: 'Jan', a: 1, b: 2 }, { m: 'Feb', a: 3, b: 4 }],
        mapping: { x: 'm', y: ['a', 'b'] },
        percent: true,
      },
    },
    {
      name: 'Heatmap with inline colorScale array',
      Comp: Heatmap, Cls: HeatmapChart,
      props: {
        data: [{ h: 1, d: 'Mon', v: 5 }],
        mapping: { x: 'h', y: 'd', valueField: 'v' },
        colorScale: ['#0a1230', '#5b8cff'],
      },
    },
    {
      name: 'Combo with inline lineSeries array + y-array',
      Comp: Combo, Cls: ComboChart,
      props: {
        data: [{ m: 'Jan', r: 1, c: 2, t: 3 }],
        mapping: { x: 'm', y: ['r', 'c', 't'] },
        lineSeries: ['t'],
        lineWidth: 3,
      },
    },
    {
      name: 'Line with inline padding object + formatValue function',
      Comp: Line, Cls: LineChart,
      props: {
        data: [{ m: 'Jan', r: 1 }, { m: 'Feb', r: 2 }],
        mapping: { x: 'm', y: 'r' },
        padding: { top: 24, right: 16, bottom: 32, left: 48 },
        formatValue: (v: number) => `$${v}`,
      },
    },
  ];

  cases.forEach(({ name, Comp, Cls, props }) => {
    it(`${name} — unrelated state updates do not re-fire setData`, async () => {
      let setDataCount = 0;
      const orig = Cls.prototype.setData;
      Cls.prototype.setData = function (...a: any[]) {
        setDataCount++; return orig.apply(this, a);
      };

      try {
        function App() {
          const [, force] = useState(0);
          // Inline literals match the playground patterns; props is also
          // recreated each render so all child props get fresh refs.
          const inline = {
            ...props,
            mapping: { ...props.mapping },
            ...(Array.isArray(props.colorScale) ? { colorScale: [...props.colorScale] } : {}),
            ...(Array.isArray(props.lineSeries) ? { lineSeries: [...props.lineSeries] } : {}),
            ...(props.padding ? { padding: { ...props.padding } } : {}),
            ...(props.mapping?.colorMap ? { mapping: { ...props.mapping, colorMap: { ...props.mapping.colorMap } } } : {}),
            ...(Array.isArray(props.mapping?.y) ? { mapping: { ...props.mapping, y: [...props.mapping.y] } } : {}),
          };
          return (
            <>
              <button onClick={() => force(n => n + 1)}>bump</button>
              <Comp animate={false} width={400} height={200} {...inline} />
            </>
          );
        }
        const { getByText } = render(<App />);
        await settle();
        const baseline = setDataCount;

        for (let i = 0; i < 5; i++) {
          fireEvent.click(getByText('bump'));
          await settle();
        }
        expect(setDataCount).toBe(baseline);
      } finally {
        Cls.prototype.setData = orig;
      }
    });
  });

  it('setData/_draw must not fire as a side effect of a click handler updating App state', async () => {
    let setDataCount = 0;
    let drawCount = 0;
    const origSet = LineChart.prototype.setData;
    const origDraw = (LineChart.prototype as any)._draw;
    LineChart.prototype.setData = function (...a) { setDataCount++; return origSet.apply(this, a as any); };
    (LineChart.prototype as any)._draw = function (...a: any[]) { drawCount++; return origDraw.apply(this, a); };

    try {
      const data = [
        { m: 'Jan', r: 1 }, { m: 'Feb', r: 2 }, { m: 'Mar', r: 3 },
      ];

      function App() {
        const [log, setLog] = useState<string[]>([]);
        // Match the playground pattern: a fresh function reference on
        // every render, not a useCallback. This is the typical consumer
        // shape and is what the React adapter must absorb.
        const onPointClick = (i: number) => {
          setLog(prev => [`click ${i}`, ...prev].slice(0, 20));
        };
        return (
          <>
            <Line
              data={data}
              mapping={{ x: 'm', y: 'r' }}
              animate={false}
              width={400}
              height={200}
              onPointClick={onPointClick}
            />
            <pre data-testid="log">{log.join('\n')}</pre>
          </>
        );
      }

      const { container } = render(<App />);
      await settle();

      const setDataAfterMount = setDataCount;
      const drawAfterMount = drawCount;
      const canvas = container.querySelector('canvas')!;

      // Drive a click — synthesise a click that the chart's _boundClick
      // will see. The click handler reads hoverIndex, which we'll seed
      // by simulating a mousemove first.
      fireEvent.mouseMove(canvas, { clientX: 200, clientY: 100 });
      await settle();
      const drawAfterHover = drawCount;

      fireEvent.click(canvas, { clientX: 200, clientY: 100 });
      await settle();

      // After the click the parent's setLog runs, App re-renders, all
      // chart deps are stable references → setData must NOT fire again.
      expect(setDataCount).toBe(setDataAfterMount);
      // Some redraws are legitimate from hover; what must not happen is
      // a fresh wave of redraws *because of the React re-render*. Check
      // there's no draw spike between `drawAfterHover` and now beyond
      // a small tolerance for hover-related work.
      expect(drawCount - drawAfterHover).toBeLessThan(3);
    } finally {
      LineChart.prototype.setData = origSet;
      (LineChart.prototype as any)._draw = origDraw;
    }
  });
});
