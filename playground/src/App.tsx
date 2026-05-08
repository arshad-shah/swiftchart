import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Line, Area, Bar, HBar, StackedBar, StackedArea,
  Pie, Donut, Scatter, Bubble, Radar, Gauge, Heatmap,
  Candlestick, Boxplot, Funnel, Sankey, Treemap, Waterfall,
  Combo, RadialBar, Bullet, Marimekko, Network,
  SparklineComponent,
  type ChartRef,
} from '@arshad-shah/swift-chart/react';
import { addTheme } from '@arshad-shah/swift-chart';
import {
  monthly, fruit, scatterPoints, radarSkills, candles, boxplot,
  funnelStages, sankeyNodes, sankeyLinks, networkNodes, networkLinks,
  treemapItems, heatmap, bullets, waterfall, marimekko,
} from './data';
import { Card } from './Card';
import { useEventLog } from './useEventLog';

// Register a custom theme up-front to verify the global theme registry.
addTheme('neon', {
  bg: '#0a0a0f',
  surface: '#111118',
  grid: '#ffffff10',
  text: '#e0e0ff',
  textMuted: '#6060a0',
  axis: '#2a2a4a',
  positive: '#4ade80',
  negative: '#ef4444',
  onAccent: '#0a0a0f',
  colors: ['#ff00ff', '#00ffff', '#ffff00', '#ff7700', '#00ff77'],
});

const THEMES = ['midnight', 'arctic', 'ember', 'forest', 'neon'] as const;

export function App() {
  const [theme, setTheme] = useState<(typeof THEMES)[number]>('midnight');
  const [tick, setTick] = useState(0);
  const [animate, setAnimate] = useState(true);
  const [streaming, setStreaming] = useState(false);
  const { lines, log, clear } = useEventLog();

  // Streaming data: forces dynamic re-renders to verify the data dep tracking.
  useEffect(() => {
    if (!streaming) return;
    const id = window.setInterval(() => setTick(t => t + 1), 1500);
    return () => window.clearInterval(id);
  }, [streaming]);

  const liveSeries = useMemo(
    () => monthly.map(row => ({
      ...row,
      revenue: row.revenue + Math.round(Math.sin(tick / 2) * 30 + (Math.random() - 0.5) * 20),
      cost: row.cost + Math.round(Math.cos(tick / 3) * 20 + (Math.random() - 0.5) * 10),
    })),
    [tick],
  );

  // Ref API: resize() and toDataURL() exercise the imperative handle.
  const lineRef = useRef<ChartRef>(null);
  const exportPNG = () => {
    const url = lineRef.current?.toDataURL('image/png');
    if (!url) {
      log('toDataURL returned null');
      return;
    }
    const a = document.createElement('a');
    a.href = url;
    a.download = 'line-chart.png';
    a.click();
    log(`exported PNG (${Math.round(url.length / 1024)} KB data URL)`);
  };
  const forceResize = () => {
    lineRef.current?.resize();
    log('called chart.resize()');
  };

  // Showcases the v1.2.0 ChartClickEvent (third arg). Modifier keys, the
  // original datum, the resolved series, and the numeric value all flow
  // through — enough to wire the chart into a drill-down / journey flow.
  const onClickLog = (label: string) => (
    _i: number,
    _data: any,
    e: {
      index: number;
      seriesIndex: number;
      label: string;
      value: number;
      datum: any;
      series?: { label: string };
      nativeEvent: MouseEvent;
    },
  ) => {
    const mods = [
      e.nativeEvent.metaKey && '⌘',
      e.nativeEvent.ctrlKey && '⌃',
      e.nativeEvent.shiftKey && '⇧',
      e.nativeEvent.altKey && '⌥',
    ].filter(Boolean).join('');
    const datumPreview = e.datum
      ? JSON.stringify(e.datum).slice(0, 60)
      : '—';
    log(
      `${label} click${mods ? ` ${mods}` : ''} · ` +
      `label=${e.label || '?'} value=${Number.isFinite(e.value) ? e.value : '—'} ` +
      `series=${e.series?.label ?? '—'}[${e.seriesIndex}] ` +
      `datum=${datumPreview}`,
    );
  };

  return (
    <>
      <header>
        <a className="brand" href="https://swiftchart.arshadshah.com" target="_blank" rel="noreferrer">
          <svg
            className="brand-mark"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 40 40"
            width="28"
            height="28"
            aria-hidden="true"
          >
            <rect width="40" height="40" rx="8" fill="#5b8cff" />
            <path
              d="M6 28 L13 21 L18 24 L23 13 L28 18 L34 8"
              stroke="#ffffff"
              strokeWidth="2.8"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle cx="34" cy="8" r="2.4" fill="#ffffff" />
          </svg>
          <span className="brand-text">
            <span className="brand-wordmark">SwiftChart</span>
            <span className="brand-tagline">Playground</span>
          </span>
        </a>
        <span className="tag ok">{theme}</span>
        <label style={{ fontSize: 12, color: 'var(--muted)' }}>
          Theme&nbsp;
          <select value={theme} onChange={e => setTheme(e.target.value as any)}>
            {THEMES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </label>
        <button onClick={() => setAnimate(a => !a)}>
          animate: {String(animate)}
        </button>
        <button onClick={() => setStreaming(s => !s)}>
          {streaming ? 'pause stream' : 'start stream'}
        </button>
        <button onClick={() => setTick(t => t + 1)}>step data</button>
        <button onClick={forceResize}>resize()</button>
        <button onClick={exportPNG}>toDataURL → PNG</button>
        <button onClick={clear}>clear log</button>
      </header>

      <main>
        <section>
          <h2>
            Event log
            <span className="tag">v1.2.0 ChartClickEvent — datum, value, series, modifier keys</span>
          </h2>
          <div className="log">
            {lines.length === 0
              ? '(no events — click any data point. Hold ⌘/⌃/⇧/⌥ to see modifier keys flow through.)'
              : lines.join('\n')}
          </div>
        </section>

        <section>
          <h2>Line / Area — field mapping, ref API, streaming</h2>
          <div className="grid">
            <Card
              title="Line (multi-series, ref'd, click)"
              caption="data + mapping. Click any point to log the index."
            >
              <Line
                ref={lineRef}
                data={liveSeries}
                mapping={{ x: 'month', y: ['revenue', 'cost', 'target'] }}
                theme={theme}
                animate={animate}
                animDuration={500}
                animEasing="easeOutCubic"
                showLegend
                legendPosition="top"
                title="Revenue, cost & target"
                subtitle="streaming demo"
                formatValue={v => `$${v}k`}
                onPointClick={onClickLog('Line')}
                width="100%"
                height="100%"
              />
            </Card>
            <Card title="Area (smooth, dots, custom palette via colorFn)">
              <Area
                data={liveSeries}
                mapping={{ x: 'month', y: ['revenue'] }}
                theme={theme}
                area
                smooth
                dots
                lineWidth={3}
                colorFn={v => (v < 130 ? '#ef4444' : v > 220 ? '#22c55e' : '#5b8cff')}
                animate={animate}
                width="100%"
                height="100%"
              />
            </Card>
            <Card title="Step line + custom padding + tooltip off">
              <Line
                data={monthly}
                mapping={{ x: 'month', y: 'revenue' }}
                theme={theme}
                step="middle"
                padding={{ top: 24, right: 16, bottom: 32, left: 48 }}
                showTooltip={false}
                animate={animate}
                width="100%"
                height="100%"
              />
            </Card>
            <Card title="Pre-built datasets (mapping escape hatch)">
              <Line
                mapping={{
                  labels: monthly.map(m => m.month),
                  datasets: [
                    { label: 'A', data: monthly.map(m => m.revenue), color: '#ff7ab6' },
                    { label: 'B', data: monthly.map(m => m.cost), color: '#7ad7ff' },
                  ],
                }}
                theme={theme}
                animate={animate}
                width="100%"
                height="100%"
              />
            </Card>
          </div>
        </section>

        <section>
          <h2>Bar variants — colorField, colorMap, horizontal, stacks</h2>
          <div className="grid">
            <Card title="Bar with colorField + colorMap">
              <Bar
                data={monthly}
                mapping={{
                  x: 'month',
                  y: 'revenue',
                  colorField: 'status',
                  colorMap: { ok: '#22c55e', warn: '#f59e0b', err: '#ef4444' },
                }}
                theme={theme}
                animate={animate}
                onPointClick={onClickLog('Bar')}
                width="100%"
                height="100%"
              />
            </Card>
            <Card title="Horizontal bar (barRatio=0.8)">
              <HBar
                data={fruit}
                mapping={{ x: 'name', y: 'count' }}
                barRatio={0.8}
                theme={theme}
                animate={animate}
                onPointClick={onClickLog('HBar')}
                width="100%"
                height="100%"
              />
            </Card>
            <Card title="Stacked bar (percent)">
              <StackedBar
                data={monthly}
                mapping={{ x: 'month', y: ['revenue', 'cost'] }}
                percent
                theme={theme}
                animate={animate}
                onPointClick={onClickLog('StackedBar')}
                width="100%"
                height="100%"
              />
            </Card>
            <Card title="Stacked area">
              <StackedArea
                data={monthly}
                mapping={{ x: 'month', y: ['revenue', 'cost', 'target'] }}
                theme={theme}
                animate={animate}
                onPointClick={onClickLog('StackedArea')}
                width="100%"
                height="100%"
              />
            </Card>
          </div>
        </section>

        <section>
          <h2>Pie, Donut, Gauge, Treemap, Funnel, Waterfall</h2>
          <div className="grid">
            <Card title="Pie">
              <Pie
                data={fruit}
                mapping={{ labelField: 'name', valueField: 'count' }}
                theme={theme}
                animate={animate}
                onPointClick={onClickLog('Pie')}
                width="100%"
                height="100%"
              />
            </Card>
            <Card title="Donut (donutWidth=0.55)">
              <Donut
                data={fruit}
                mapping={{ labelField: 'name', valueField: 'count' }}
                donut
                donutWidth={0.55}
                theme={theme}
                animate={animate}
                onPointClick={onClickLog('Donut')}
                width="100%"
                height="100%"
              />
            </Card>
            <Card title="Gauge w/ segments (live value)">
              <Gauge
                data={[{ v: 60 + (tick % 40) }]}
                mapping={{ valueField: 'v' }}
                min={0}
                max={100}
                segments={[
                  { color: '#22c55e', to: 60 },
                  { color: '#f59e0b', to: 85 },
                  { color: '#ef4444', to: 100 },
                ]}
                theme={theme}
                animate={animate}
                width="100%"
                height="100%"
              />
            </Card>
            <Card title="Treemap">
              <Treemap
                data={treemapItems}
                mapping={{ labelField: 'label', valueField: 'value' }}
                theme={theme}
                animate={animate}
                onPointClick={onClickLog('Treemap')}
                width="100%"
                height="100%"
              />
            </Card>
            <Card title="Funnel (pyramid)">
              <Funnel
                data={funnelStages}
                mapping={{ x: 'stage', y: 'users' }}
                pyramid
                showPercent
                theme={theme}
                animate={animate}
                onPointClick={onClickLog('Funnel')}
                width="100%"
                height="100%"
              />
            </Card>
            <Card title="Waterfall">
              <Waterfall
                data={waterfall}
                mapping={{ x: 'label', y: 'value' }}
                theme={theme}
                animate={animate}
                onPointClick={onClickLog('Waterfall')}
                width="100%"
                height="100%"
              />
            </Card>
          </div>
        </section>

        <section>
          <h2>Scatter, Bubble, Radar, Heatmap</h2>
          <div className="grid">
            <Card title="Scatter (groups → palette)">
              <Scatter
                data={scatterPoints}
                mapping={{ x: 'x', y: 'y', groupField: 'group' }}
                theme={theme}
                animate={animate}
                onPointClick={onClickLog('Scatter')}
                width="100%"
                height="100%"
              />
            </Card>
            <Card title="Bubble (sizeField)">
              <Bubble
                data={scatterPoints}
                mapping={{ x: 'x', y: 'y', sizeField: 'size', groupField: 'group' }}
                sizeScale={1}
                maxRadius={28}
                theme={theme}
                animate={animate}
                onPointClick={onClickLog('Bubble')}
                width="100%"
                height="100%"
              />
            </Card>
            <Card title="Radar (multi-series)">
              <Radar
                data={radarSkills}
                mapping={{ x: 'axis', y: ['alice', 'bob'] }}
                theme={theme}
                animate={animate}
                width="100%"
                height="100%"
              />
            </Card>
            <Card title="Heatmap">
              <Heatmap
                data={heatmap}
                mapping={{ x: 'hour', y: 'day', valueField: 'value' }}
                showValues={false}
                colorScale={['#0a1230', '#5b8cff']}
                theme={theme}
                animate={animate}
                onPointClick={onClickLog('Heatmap')}
                width="100%"
                height="100%"
              />
            </Card>
          </div>
        </section>

        <section>
          <h2>Financial / statistical / advanced</h2>
          <div className="grid">
            <Card title="Candlestick">
              <Candlestick
                data={candles}
                mapping={{ x: 'label' }}
                theme={theme}
                animate={animate}
                onPointClick={onClickLog('Candlestick')}
                width="100%"
                height="100%"
              />
            </Card>
            <Card title="Boxplot">
              <Boxplot
                data={boxplot}
                mapping={{ x: 'label' }}
                showOutliers
                theme={theme}
                animate={animate}
                onPointClick={onClickLog('Boxplot')}
                width="100%"
                height="100%"
              />
            </Card>
            <Card title="Combo (bar + line series)">
              <Combo
                data={monthly}
                mapping={{ x: 'month', y: ['revenue', 'cost', 'target'] }}
                lineSeries={['target']}
                lineWidth={3}
                theme={theme}
                animate={animate}
                onPointClick={onClickLog('Combo')}
                width="100%"
                height="100%"
              />
            </Card>
            <Card title="Radial bar (rose)">
              <RadialBar
                data={fruit}
                mapping={{ labelField: 'name', valueField: 'count' }}
                rose
                innerRadius={0.35}
                theme={theme}
                animate={animate}
                onPointClick={onClickLog('RadialBar')}
                width="100%"
                height="100%"
              />
            </Card>
            <Card title="Bullet">
              <Bullet
                data={bullets}
                mapping={{ x: 'label', y: 'value' }}
                theme={theme}
                animate={animate}
                onPointClick={onClickLog('Bullet')}
                width="100%"
                height="100%"
              />
            </Card>
            <Card title="Marimekko">
              <Marimekko
                data={marimekko}
                mapping={{ x: 'region', y: ['Pro', 'Plus', 'Free'] }}
                theme={theme}
                animate={animate}
                onPointClick={onClickLog('Marimekko')}
                width="100%"
                height="100%"
              />
            </Card>
            <Card title="Sankey (nodes/links props)">
              <Sankey
                nodes={sankeyNodes}
                links={sankeyLinks}
                theme={theme}
                animate={animate}
                onPointClick={onClickLog('Sankey')}
                width="100%"
                height="100%"
              />
            </Card>
            <Card title="Network (force-directed)">
              <Network
                nodes={networkNodes}
                links={networkLinks}
                iterations={250}
                theme={theme}
                animate={animate}
                onPointClick={onClickLog('Network')}
                width="100%"
                height="100%"
              />
            </Card>
          </div>
        </section>

        <section>
          <h2>Sparklines (zero-config inline)</h2>
          <div className="grid">
            <Card
              title="Inline sparklines"
              caption="Filled, unfilled, themed, custom color."
            >
              <div style={{ display: 'flex', gap: 16, alignItems: 'center', height: '100%', flexWrap: 'wrap' }}>
                <SparklineComponent data={monthly.map(m => m.revenue)} height={40} width={140} />
                <SparklineComponent data={monthly.map(m => m.cost)} filled height={40} width={140} color="#ff7ab6" />
                <SparklineComponent data={liveSeries.map(m => m.revenue)} filled height={40} width={140} theme={theme} />
                <SparklineComponent data={[1, 4, 2, 8, 5, 9, 7, 12]} height={40} width={140} animate={false} />
              </div>
            </Card>
          </div>
        </section>

        <section>
          <h2>Dense x-axis labels — issue #26 sub-item 8</h2>
          <p style={{ color: '#7a8599', marginTop: 0, fontSize: 13 }}>
            These charts have many ticks with long labels. Watch the rotated
            labels at narrow widths — if they still overlap or collide with
            adjacent rotated labels, sub-item 8 of the polish issue is valid.
          </p>
          <div className="grid">
            <Card title="Bar — 30 long labels in a 320 px slot">
              <div style={{ width: 320, height: 240 }}>
                <Bar
                  data={Array.from({ length: 30 }).map((_, i) => ({
                    quarter: `2024-Q${(i % 4) + 1}-Region-${String.fromCharCode(65 + (i % 26))}-${i}`,
                    revenue: 100 + ((i * 37) % 200),
                  }))}
                  mapping={{ x: 'quarter', y: 'revenue' }}
                  theme={theme}
                  animate={false}
                  showLegend={false}
                  width="100%"
                  height="100%"
                />
              </div>
            </Card>
            <Card title="Line — 50 timestamps, narrow viewport">
              <div style={{ width: 360, height: 240 }}>
                <Line
                  data={Array.from({ length: 50 }).map((_, i) => ({
                    t: `2026-${String((i % 12) + 1).padStart(2, '0')}-${String((i % 28) + 1).padStart(2, '0')} 14:35`,
                    v: 50 + Math.sin(i * 0.4) * 30 + i * 1.5,
                  }))}
                  mapping={{ x: 't', y: 'v' }}
                  theme={theme}
                  animate={false}
                  showLegend={false}
                  width="100%"
                  height="100%"
                />
              </div>
            </Card>
            <Card title="Stacked bar — 24 categories, very tight">
              <div style={{ width: 280, height: 240 }}>
                <StackedBar
                  data={Array.from({ length: 24 }).map((_, i) => ({
                    label: `Department-${String.fromCharCode(65 + (i % 26))}${i}-2026`,
                    api: 30 + ((i * 13) % 80),
                    web: 20 + ((i * 7) % 60),
                    mobile: 10 + ((i * 11) % 40),
                  }))}
                  mapping={{ x: 'label', y: ['api', 'web', 'mobile'] }}
                  theme={theme}
                  animate={false}
                  width="100%"
                  height="100%"
                />
              </div>
            </Card>
            <Card title="Bar — 60 single-letter labels (rotation skip path)">
              <div style={{ width: 360, height: 240 }}>
                <Bar
                  data={Array.from({ length: 60 }).map((_, i) => ({
                    k: String.fromCharCode(65 + (i % 26)) + (i + 1),
                    v: 50 + ((i * 17) % 150),
                  }))}
                  mapping={{ x: 'k', y: 'v' }}
                  theme={theme}
                  animate={false}
                  showLegend={false}
                  width="100%"
                  height="100%"
                />
              </div>
            </Card>
          </div>
        </section>

        <section>
          <h2>Stress: many charts mounted at once</h2>
          <div className="grid">
            {Array.from({ length: 12 }).map((_, i) => (
              <Card key={i} title={`Mini #${i + 1}`}>
                <Line
                  data={liveSeries}
                  mapping={{ x: 'month', y: 'revenue' }}
                  theme={theme}
                  animate={false}
                  showLegend={false}
                  showGrid={false}
                  width="100%"
                  height="100%"
                />
              </Card>
            ))}
          </div>
        </section>
      </main>
    </>
  );
}
