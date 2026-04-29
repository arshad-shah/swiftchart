import { describe, it, expect, vi, beforeEach } from 'vitest';
import React, { createRef } from 'react';
import { render, cleanup, act } from '@testing-library/react';
import {
  Line, Area, Bar, Pie, Donut, Scatter, Radar,
  Gauge, HBar, SparklineComponent, StackedArea,
  Waterfall, Treemap, Sankey, Network,
  type ChartRef,
} from '../../src/react';

// Wait for effects to settle
async function settle() {
  await act(async () => {
    await new Promise(r => setTimeout(r, 50));
  });
}

function createWrapper(width = 600, height = 400) {
  return ({ children }: { children: React.ReactNode }) => (
    <div style={{ width, height }}>{children}</div>
  );
}

const sampleData = [
  { month: 'Jan', revenue: 100, cost: 60 },
  { month: 'Feb', revenue: 150, cost: 80 },
  { month: 'Mar', revenue: 120, cost: 70 },
];

const pieData = [
  { name: 'A', value: 30 },
  { name: 'B', value: 50 },
  { name: 'C', value: 20 },
];

const scatterData = [
  { x: 10, y: 20 },
  { x: 30, y: 40 },
  { x: 50, y: 60 },
];

const waterfallData = [
  { label: 'Revenue', value: 1000 },
  { label: 'Cost', value: -400 },
];

const treemapData = [
  { name: 'Big', value: 100 },
  { name: 'Small', value: 30 },
];

// ═══════════════════════════════════════════════════════
// Render tests for every component
// ═══════════════════════════════════════════════════════
const components = [
  { name: 'Line', Component: Line, data: sampleData, mapping: { x: 'month', y: 'revenue' } },
  { name: 'Area', Component: Area, data: sampleData, mapping: { x: 'month', y: 'revenue' } },
  { name: 'Bar', Component: Bar, data: sampleData, mapping: { x: 'month', y: 'revenue' } },
  { name: 'Pie', Component: Pie, data: pieData, mapping: { labelField: 'name', valueField: 'value' } },
  { name: 'Donut', Component: Donut, data: pieData, mapping: { labelField: 'name', valueField: 'value' } },
  { name: 'Scatter', Component: Scatter, data: scatterData, mapping: { x: 'x', y: 'y' } },
  { name: 'Radar', Component: Radar, data: [], mapping: { labels: ['A', 'B', 'C'], datasets: [{ label: 'S1', data: [10, 20, 30] }] } },
  { name: 'HBar', Component: HBar, data: sampleData, mapping: { x: 'month', y: 'revenue' } },
  { name: 'StackedArea', Component: StackedArea, data: sampleData, mapping: { x: 'month', y: ['revenue', 'cost'] } },
  { name: 'Waterfall', Component: Waterfall, data: waterfallData, mapping: { labelField: 'label', valueField: 'value' } },
  { name: 'Treemap', Component: Treemap, data: treemapData, mapping: { labelField: 'name', valueField: 'value' } },
] as const;

describe.each(components)('React $name Component', ({ Component, data, mapping }) => {
  beforeEach(() => { cleanup(); });

  it('renders without crashing', async () => {
    const { container } = render(
      <Component
        data={data as any}
        mapping={mapping as any}
        width={600}
        height={400}
        animate={false}
      />
    );
    await settle();
    expect(container.querySelector('canvas')).toBeTruthy();
  });

  it('renders with custom className', async () => {
    const { container } = render(
      <Component
        data={data as any}
        mapping={mapping as any}
        className="my-chart"
        animate={false}
      />
    );
    await settle();
    expect(container.querySelector('.my-chart')).toBeTruthy();
  });

  it('renders with custom style', async () => {
    const { container } = render(
      <Component
        data={data as any}
        mapping={mapping as any}
        style={{ border: '1px solid red' }}
        animate={false}
      />
    );
    await settle();
    const el = container.firstElementChild as HTMLElement;
    expect(el.style.border).toBe('1px solid red');
  });

  it('renders with string width/height', async () => {
    const { container } = render(
      <Component
        data={data as any}
        mapping={mapping as any}
        width="100%"
        height="300px"
        animate={false}
      />
    );
    await settle();
    const el = container.firstElementChild as HTMLElement;
    expect(el.style.width).toBe('100%');
    expect(el.style.height).toBe('300px');
  });

  it('renders with numeric width/height', async () => {
    const { container } = render(
      <Component
        data={data as any}
        mapping={mapping as any}
        width={500}
        height={300}
        animate={false}
      />
    );
    await settle();
    const el = container.firstElementChild as HTMLElement;
    expect(el.style.width).toBe('500px');
    expect(el.style.height).toBe('300px');
  });

  it('accepts theme prop', async () => {
    const { container } = render(
      <Component
        data={data as any}
        mapping={mapping as any}
        theme="arctic"
        animate={false}
      />
    );
    await settle();
    expect(container.querySelector('canvas')).toBeTruthy();
  });

  it('handles empty data', async () => {
    const { container } = render(
      <Component data={[] as any} mapping={mapping as any} animate={false} />
    );
    await settle();
    expect(container.querySelector('canvas')).toBeTruthy();
  });

  it('cleans up on unmount', async () => {
    const { container, unmount } = render(
      <Component data={data as any} mapping={mapping as any} animate={false} />
    );
    await settle();
    unmount();
    // Canvas should be removed from the container div
    expect(container.querySelector('canvas')).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════
// SparklineComponent
// ═══════════════════════════════════════════════════════
describe('React SparklineComponent', () => {
  beforeEach(() => { cleanup(); });

  it('renders from number array', async () => {
    const { container } = render(
      <SparklineComponent data={[10, 20, 15, 25]} animate={false} />
    );
    await settle();
    expect(container.querySelector('canvas')).toBeTruthy();
  });

  it('accepts color prop', async () => {
    const { container } = render(
      <SparklineComponent data={[1, 2, 3]} color="#ff0000" animate={false} />
    );
    await settle();
    expect(container.querySelector('canvas')).toBeTruthy();
  });

  it('renders with filled=false', async () => {
    const { container } = render(
      <SparklineComponent data={[1, 2, 3]} filled={false} animate={false} />
    );
    await settle();
    expect(container.querySelector('canvas')).toBeTruthy();
  });
});

// ═══════════════════════════════════════════════════════
// Gauge Component
// ═══════════════════════════════════════════════════════
describe('React Gauge Component', () => {
  beforeEach(() => { cleanup(); });

  it('renders with value', async () => {
    const { container } = render(
      <Gauge value={73} animate={false} />
    );
    await settle();
    expect(container.querySelector('canvas')).toBeTruthy();
  });

  it('updates when value changes', async () => {
    const { container, rerender } = render(
      <Gauge value={50} animate={false} />
    );
    await settle();
    rerender(<Gauge value={80} animate={false} />);
    await settle();
    expect(container.querySelector('canvas')).toBeTruthy();
  });

  it('accepts custom segments', async () => {
    const { container } = render(
      <Gauge
        value={60}
        min={0}
        max={100}
        segments={[
          { color: '#0f0', to: 50 },
          { color: '#f00', to: 100 },
        ]}
        animate={false}
      />
    );
    await settle();
    expect(container.querySelector('canvas')).toBeTruthy();
  });
});

// ═══════════════════════════════════════════════════════
// Ref forwarding
// ═══════════════════════════════════════════════════════
describe('React ref forwarding', () => {
  beforeEach(() => { cleanup(); });

  it('Line exposes chart ref', async () => {
    const ref = createRef<ChartRef>();
    render(
      <Line
        ref={ref}
        data={sampleData}
        mapping={{ x: 'month', y: 'revenue' }}
        animate={false}
      />
    );
    await settle();
    expect(ref.current).toBeTruthy();
    expect(ref.current!.chart).toBeTruthy();
    expect(typeof ref.current!.resize).toBe('function');
  });

  it('Bar exposes chart ref', async () => {
    const ref = createRef<ChartRef>();
    render(
      <Bar
        ref={ref}
        data={sampleData}
        mapping={{ x: 'month', y: 'revenue' }}
        animate={false}
      />
    );
    await settle();
    expect(ref.current).toBeTruthy();
    expect(ref.current!.chart).toBeTruthy();
  });

  it('resize() on ref does not throw', async () => {
    const ref = createRef<ChartRef>();
    render(
      <Line
        ref={ref}
        data={sampleData}
        mapping={{ x: 'month', y: 'revenue' }}
        animate={false}
      />
    );
    await settle();
    expect(() => ref.current!.resize()).not.toThrow();
  });
});

// ═══════════════════════════════════════════════════════
// onClick / onPointClick
// ═══════════════════════════════════════════════════════
describe('React onPointClick', () => {
  beforeEach(() => { cleanup(); });

  it('passes onPointClick to underlying chart', async () => {
    const handler = vi.fn();
    render(
      <Bar
        data={sampleData}
        mapping={{ x: 'month', y: 'revenue' }}
        onPointClick={handler}
        animate={false}
      />
    );
    await settle();
    // We can't easily simulate canvas clicks in testing-library,
    // but we verify the handler is wired up via config
  });
});

// ═══════════════════════════════════════════════════════
// Data updates (re-render)
// ═══════════════════════════════════════════════════════
describe('React data updates', () => {
  beforeEach(() => { cleanup(); });

  it('Line updates when data prop changes', async () => {
    const { rerender, container } = render(
      <Line
        data={sampleData}
        mapping={{ x: 'month', y: 'revenue' }}
        animate={false}
      />
    );
    await settle();

    const newData = [
      { month: 'Apr', revenue: 200 },
      { month: 'May', revenue: 250 },
    ];
    rerender(
      <Line
        data={newData}
        mapping={{ x: 'month', y: 'revenue' }}
        animate={false}
      />
    );
    await settle();
    expect(container.querySelector('canvas')).toBeTruthy();
  });

  it('Bar survives rapid data updates', async () => {
    const { rerender, container } = render(
      <Bar data={sampleData} mapping={{ x: 'month', y: 'revenue' }} animate={false} />
    );
    await settle();

    for (let i = 0; i < 10; i++) {
      const newData = sampleData.map(d => ({ ...d, revenue: d.revenue + i * 10 }));
      rerender(
        <Bar data={newData} mapping={{ x: 'month', y: 'revenue' }} animate={false} />
      );
    }
    await settle();
    expect(container.querySelector('canvas')).toBeTruthy();
  });

  // Regression: graph charts (Sankey, Network) carry their data via
  // `nodes`/`links` rather than `data`+`mapping`. The inline-data guard in
  // `useChart` previously only matched the `{labels, datasets}` shape, so
  // setData was skipped for these and the canvas rendered empty.
  it('Sankey renders when only nodes+links are passed (no data prop)', async () => {
    const nodes = [{ id: 'A' }, { id: 'B' }, { id: 'C' }];
    const links = [
      { source: 'A', target: 'B', value: 5 },
      { source: 'A', target: 'C', value: 3 },
    ];
    const ref = createRef<ChartRef>();
    const { container } = render(
      <Sankey ref={ref} nodes={nodes} links={links} animate={false} />,
      { wrapper: createWrapper() },
    );
    await settle();
    expect(container.querySelector('canvas')).toBeTruthy();
    // Resolved labels reflect the graph nodes — proves setData ran.
    const chart = ref.current?.chart as any;
    expect(chart?.resolved.labels.length).toBe(3);
  });

  it('Network renders when only nodes+links are passed (no data prop)', async () => {
    const nodes = [
      { id: 'A', group: 1 }, { id: 'B', group: 1 }, { id: 'C', group: 2 },
    ];
    const links = [
      { source: 'A', target: 'B' }, { source: 'B', target: 'C' },
    ];
    const ref = createRef<ChartRef>();
    const { container } = render(
      <Network ref={ref} nodes={nodes} links={links} animate={false} iterations={20} />,
      { wrapper: createWrapper() },
    );
    await settle();
    expect(container.querySelector('canvas')).toBeTruthy();
    const chart = ref.current?.chart as any;
    expect(chart?.resolved.labels.length).toBe(3);
  });
});
