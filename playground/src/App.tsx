import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Container, Section, Stack, Inline, Grid, Box, Divider,
  Heading, Text, Code,
  Card, CardHeader, CardBody, CardTitle, CardDescription,
  Tabs, TabsList, TabsTrigger, TabsContent,
  Switch, Select, Slider, Button,
  Badge,
  Checkbox, CheckboxGroup,
  Radio, RadioGroup,
} from '@arshad-shah/cynosure-react';
import {
  Line, Area, Bar, HBar, Pie, Donut, Scatter, Radar, Gauge,
  SparklineComponent, StackedArea, Waterfall, Treemap,
  type ChartRef,
} from 'swiftchart/react';
import type { Theme, ThemeName } from 'swiftchart';
import { addTheme, StreamDataset } from 'swiftchart';
import {
  monthlySales, traffic, regionPnL, skills, scatterClusters,
  waterfall, treemap, stacked, bigSeries, xssData,
} from './data';
import { BrandMark, BrandMarkBare } from './Brand';
import { Docs } from './Docs';

addTheme('neon', {
  bg: '#080010', surface: '#150024', grid: '#ffffff10',
  text: '#fbcfe8', textMuted: '#a78bfa', axis: '#5b21b6',
  positive: '#86efac', negative: '#fb7185', onAccent: '#0a0014',
  colors: ['#f0abfc', '#67e8f9', '#fde68a', '#f9a8d4', '#a5b4fc'],
} as Theme);

const THEMES: { value: ThemeName; label: string }[] = [
  { value: 'midnight', label: 'Midnight' },
  { value: 'arctic',   label: 'Arctic'   },
  { value: 'ember',    label: 'Ember'    },
  { value: 'forest',   label: 'Forest'   },
  { value: 'neon' as ThemeName, label: 'Neon' },
];

const LEGEND_OPTIONS = [
  { value: 'top', label: 'Top' },
  { value: 'bottom', label: 'Bottom' },
  { value: 'left', label: 'Left' },
  { value: 'right', label: 'Right' },
  { value: 'none', label: 'None' },
];

type LegendPos = 'top' | 'bottom' | 'left' | 'right' | 'none';

export function App() {
  const [theme, setTheme] = useState<ThemeName>('midnight');
  const [animate, setAnimate] = useState(true);
  const [legendPos, setLegendPos] = useState<LegendPos>('top');
  const [tab, setTab] = useState<string>('docs');
  const showToolbar = tab !== 'docs';

  return (
    <Box className="app-shell">
      <Container size="xl">
        <Box paddingY="8">
          <Hero />

          <Tabs value={tab} onValueChange={setTab} variant="line" size="md">
            <TabsList>
              <TabsTrigger value="docs">Docs</TabsTrigger>
              <TabsTrigger value="cartesian">Cartesian</TabsTrigger>
              <TabsTrigger value="parts">Parts of a whole</TabsTrigger>
              <TabsTrigger value="distribution">Distribution</TabsTrigger>
              <TabsTrigger value="kpi">KPIs &amp; sparklines</TabsTrigger>
              <TabsTrigger value="advanced">Advanced</TabsTrigger>
              <TabsTrigger value="security">Security</TabsTrigger>
            </TabsList>

            {showToolbar && (
              <Box marginTop="4">
                <Toolbar
                  theme={theme} setTheme={setTheme}
                  animate={animate} setAnimate={setAnimate}
                  legendPos={legendPos} setLegendPos={setLegendPos}
                />
              </Box>
            )}

            <TabsContent value="docs">
              <Docs />
            </TabsContent>

            <TabsContent value="cartesian">
              <Stack gap="6" marginTop="6">
                <LineDemo theme={theme} animate={animate} legendPos={legendPos} />
                <BarVerticalDemo theme={theme} animate={animate} legendPos={legendPos} />
                <HBarDemo theme={theme} animate={animate} legendPos={legendPos} />
                <StackedDemo theme={theme} animate={animate} legendPos={legendPos} />
              </Stack>
            </TabsContent>

            <TabsContent value="parts">
              <Stack gap="6" marginTop="6">
                <PieDemo theme={theme} animate={animate} legendPos={legendPos} />
                <TreemapDemo theme={theme} animate={animate} />
                <WaterfallDemo theme={theme} animate={animate} />
              </Stack>
            </TabsContent>

            <TabsContent value="distribution">
              <Stack gap="6" marginTop="6">
                <ScatterDemo theme={theme} animate={animate} legendPos={legendPos} />
                <RadarDemo theme={theme} animate={animate} legendPos={legendPos} />
              </Stack>
            </TabsContent>

            <TabsContent value="kpi">
              <Stack gap="6" marginTop="6">
                <GaugeDemo theme={theme} animate={animate} />
                <SparklineRow theme={theme} animate={animate} />
              </Stack>
            </TabsContent>

            <TabsContent value="advanced">
              <Stack gap="6" marginTop="6">
                <BigDataDemo theme={theme} animate={animate} />
                <StreamingDemo theme={theme} />
                <RefDemo theme={theme} animate={animate} />
              </Stack>
            </TabsContent>

            <TabsContent value="security">
              <Stack gap="6" marginTop="6">
                <XSSDemo theme={theme} animate={animate} />
              </Stack>
            </TabsContent>
          </Tabs>

          <Footer />
        </Box>
      </Container>
    </Box>
  );
}

// ─── Chrome ──────────────────────────────────────────────

function Hero() {
  return (
    <Stack gap="2" marginBottom="6">
      <Inline gap="3" align="center">
        <BrandMark size={40} />
        <Heading level={1} size="2xl" weight="bold">SwiftChart</Heading>
        <Badge variant="soft" colorScheme="info">v1.0</Badge>
        <Badge variant="outline" colorScheme="neutral">~12 KB gzip</Badge>
        <Badge variant="outline" colorScheme="neutral">0 deps</Badge>
      </Inline>
      <Text size="sm" color="fg.muted">
        Lightning-fast Canvas 2D charts with first-class React bindings.
        Start in <strong>Docs</strong> for install &amp; usage, then jump
        into the live demos.
      </Text>
    </Stack>
  );
}

function Toolbar({
  theme, setTheme, animate, setAnimate, legendPos, setLegendPos,
}: {
  theme: ThemeName; setTheme: (v: ThemeName) => void;
  animate: boolean; setAnimate: (v: boolean) => void;
  legendPos: LegendPos; setLegendPos: (v: LegendPos) => void;
}) {
  return (
    <Card
      variant="filled"
      size="sm"
      className="toolbar-card"
    >
      <CardBody>
        <Inline gap="4" align="center" justify="between" wrap={true}>
          <Inline gap="4" align="center" wrap={true}>
            <Select
              label="Theme"
              value={theme}
              onValueChange={(v) => setTheme(v as ThemeName)}
              items={THEMES.map(t => ({ value: t.value as string, label: t.label }))}
            />
            <Select
              label="Legend"
              value={legendPos}
              onValueChange={(v) => setLegendPos(v as LegendPos)}
              items={LEGEND_OPTIONS}
            />
            <Switch checked={animate} onCheckedChange={setAnimate}>
              Animate
            </Switch>
          </Inline>
          <Text size="sm" color="fg.muted">
            Settings apply to every chart.
          </Text>
        </Inline>
      </CardBody>
    </Card>
  );
}

function Footer() {
  const linkStyle: React.CSSProperties = {
    color: 'var(--cynosure-color-foreground-muted)',
    textDecoration: 'none',
    fontSize: 13,
  };
  return (
    <Box marginTop="10" paddingTop="8">
      <Divider tone="subtle" />
      <Box paddingTop="6">
        <Grid templateColumns="repeat(auto-fit, minmax(200px, 1fr))" gap="6">
          <Stack gap="2">
            <Inline gap="2" align="center">
              <BrandMarkBare size={28} />
              <Heading level={4} size="sm" weight="semibold">SwiftChart</Heading>
            </Inline>
            <Text size="xs" color="fg.muted">
              Lightning-fast, zero-dependency Canvas 2D charts with React bindings.
            </Text>
            <Inline gap="2" marginTop="1">
              <Badge variant="outline" size="sm">~12 KB gzip</Badge>
              <Badge variant="outline" size="sm">MIT</Badge>
            </Inline>
          </Stack>

          <Stack gap="2">
            <Text size="xs" weight="semibold" color="fg.muted">RESOURCES</Text>
            <Stack gap="1">
              <a href="#install" style={linkStyle}>Documentation</a>
              <a href="https://github.com/ArshadShah/swiftchart" target="_blank" rel="noreferrer" style={linkStyle}>GitHub</a>
              <a href="https://www.npmjs.com/package/swiftchart" target="_blank" rel="noreferrer" style={linkStyle}>npm</a>
              <a href="https://github.com/ArshadShah/swiftchart/blob/main/CHANGELOG.md" target="_blank" rel="noreferrer" style={linkStyle}>Changelog</a>
            </Stack>
          </Stack>

          <Stack gap="2">
            <Text size="xs" weight="semibold" color="fg.muted">CHART TYPES</Text>
            <Stack gap="1">
              <a href="#chart-types" style={linkStyle}>Line · Area · Bar</a>
              <a href="#chart-types" style={linkStyle}>Pie · Donut · Treemap</a>
              <a href="#chart-types" style={linkStyle}>Scatter · Radar · Gauge</a>
              <a href="#chart-types" style={linkStyle}>Sparkline · Waterfall · Stacked</a>
            </Stack>
          </Stack>

          <Stack gap="2">
            <Text size="xs" weight="semibold" color="fg.muted">BUILT WITH</Text>
            <Stack gap="1">
              <Text size="sm" color="fg.muted">
                Layout primitives by{' '}
                <a href="https://www.npmjs.com/package/@arshad-shah/cynosure-react" target="_blank" rel="noreferrer" style={{ ...linkStyle, fontSize: 13 }}>
                  @arshad-shah/cynosure-react
                </a>
              </Text>
              <Text size="sm" color="fg.muted">React 18 · Vite 6 · TypeScript</Text>
            </Stack>
          </Stack>
        </Grid>

        <Box paddingTop="6">
          <Divider tone="subtle" />
        </Box>
        <Inline justify="between" align="center" wrap={true} gap="3" marginTop="4">
          <Text size="xs" color="fg.muted">
            © {new Date().getFullYear()} Arshad Shah. Released under MIT.
          </Text>
          <Inline gap="3" align="center">
            <Text size="xs" color="fg.muted">
              <Code size="sm">npm install swiftchart</Code>
            </Text>
          </Inline>
        </Inline>
      </Box>
    </Box>
  );
}

// ─── Reusable chart card ──────────────────────────────────

function ChartCard({
  title, description, badges, controls, children, height = 320,
}: {
  title: string;
  description?: string;
  badges?: string[];
  controls?: React.ReactNode;
  children: React.ReactNode;
  height?: number;
}) {
  return (
    <Card variant="elevated" size="md">
      <CardHeader>
        <Inline gap="3" align="start" justify="between" wrap={true}>
          <Stack gap="1" flex="1" minWidth="0">
            <Inline gap="2" align="center" wrap={true}>
              <CardTitle as="h3">{title}</CardTitle>
              {badges?.map(b => (
                <Badge key={b} variant="soft" size="sm" colorScheme="neutral">{b}</Badge>
              ))}
            </Inline>
            {description && <CardDescription>{description}</CardDescription>}
          </Stack>
          {controls && <Inline gap="2" align="center" wrap={true}>{controls}</Inline>}
        </Inline>
      </CardHeader>
      <CardBody>
        <div className="sc-chart-frame" style={{ ['--sc-chart-h' as any]: `${height}px` }}>
          {children}
        </div>
      </CardBody>
    </Card>
  );
}

// ─── Cartesian ────────────────────────────────────────────

function LineDemo({ theme, animate, legendPos }: any) {
  const [flags, setFlags] = useState<string[]>(['smooth', 'dots']);
  const has = (f: string) => flags.includes(f);
  const Comp = has('area') ? Area : Line;
  return (
    <ChartCard
      title="Multi-series line"
      description="Smooth bezier vs straight, optional dots and area gradient"
      badges={['LTTB downsampling', 'crosshair', 'tooltip']}
      controls={(
        <CheckboxGroup value={flags} onChange={setFlags} aria-label="Line chart features">
          <Inline gap="3" align="center">
            <Checkbox value="smooth">smooth</Checkbox>
            <Checkbox value="dots">dots</Checkbox>
            <Checkbox value="area">area</Checkbox>
          </Inline>
        </CheckboxGroup>
      )}
    >
      <Comp
        data={monthlySales}
        mapping={{ x: 'month', y: ['revenue', 'target'] }}
        theme={theme} animate={animate} legendPosition={legendPos}
        smooth={has('smooth')} dots={has('dots')}
        title="Revenue vs Target" subtitle="Year to date"
        formatValue={(v: number) => `$${(v / 1000).toFixed(1)}K`}
        ariaLabel="Monthly revenue versus target"
      />
    </ChartCard>
  );
}

function BarVerticalDemo({ theme, animate, legendPos }: any) {
  const [mode, setMode] = useState<'grouped' | 'pnl'>('grouped');
  const data = mode === 'grouped' ? monthlySales.slice(0, 6) : regionPnL;
  const mapping = mode === 'grouped'
    ? { x: 'month', y: ['revenue', 'cost'] }
    : { x: 'region', y: 'pnl' };
  return (
    <ChartCard
      title="Vertical bar"
      description="Grouped multi-series, or single column with mixed signs"
      badges={['theme-aware', 'rounded corners', 'hover halo']}
      controls={(
        <RadioGroup
          value={mode}
          onValueChange={(v) => setMode(v as any)}
          orientation="horizontal"
          aria-label="Bar chart mode"
        >
          <Inline gap="4" align="center">
            <Radio value="grouped">Grouped</Radio>
            <Radio value="pnl">P&amp;L</Radio>
          </Inline>
        </RadioGroup>
      )}
    >
      <Bar
        data={data} mapping={mapping}
        theme={theme} animate={animate} legendPosition={legendPos}
        title={mode === 'grouped' ? 'Revenue & Cost' : 'Regional P&L'}
        formatValue={(v: number) => `$${Math.abs(v)}`}
      />
    </ChartCard>
  );
}

function HBarDemo({ theme, animate, legendPos }: any) {
  return (
    <ChartCard
      title="Horizontal bar"
      description="Long category labels, on-bar values, theme-aware foreground"
      badges={['truncation', 'on-bar text']}
    >
      <HBar
        data={traffic}
        mapping={{ x: 'source', y: 'visits' }}
        theme={theme} animate={animate} legendPosition={legendPos}
        title="Top traffic sources"
      />
    </ChartCard>
  );
}

function StackedDemo({ theme, animate, legendPos }: any) {
  return (
    <ChartCard
      title="Stacked area"
      description="Tooltip footer shows running total across series"
      badges={['stacked', 'tooltip footer']}
    >
      <StackedArea
        data={stacked}
        mapping={{ x: 'day', y: ['api', 'web', 'mobile'] }}
        theme={theme} animate={animate} legendPosition={legendPos}
        title="Requests by surface"
      />
    </ChartCard>
  );
}

// ─── Parts of a whole ─────────────────────────────────────

function PieDemo({ theme, animate, legendPos }: any) {
  const [donut, setDonut] = useState(true);
  const [donutWidth, setDonutWidth] = useState(0.55);
  return (
    <ChartCard
      title={donut ? 'Donut' : 'Pie'}
      description="Auto-detects label/value fields; donut hole shows live read-out"
      badges={['schema-agnostic', 'hover read-out']}
      controls={(
        <Inline gap="3" align="center">
          <Switch checked={donut} onCheckedChange={setDonut}>Donut</Switch>
          {donut && (
            <Box width="160px">
              <Slider
                value={donutWidth}
                onChange={(v) => setDonutWidth(typeof v === 'number' ? v : v[0])}
                minValue={0.2} maxValue={0.85} step={0.05}
                aria-label="Donut hole width"
                size="sm"
              />
            </Box>
          )}
        </Inline>
      )}
    >
      {donut ? (
        <Donut
          data={traffic}
          mapping={{ labelField: 'source', valueField: 'visits' }}
          theme={theme} animate={animate} legendPosition={legendPos}
          donutWidth={donutWidth}
          title="Traffic share"
        />
      ) : (
        <Pie
          data={traffic}
          mapping={{ labelField: 'source', valueField: 'visits' }}
          theme={theme} animate={animate} legendPosition={legendPos}
          title="Traffic share"
        />
      )}
    </ChartCard>
  );
}

function TreemapDemo({ theme, animate }: any) {
  return (
    <ChartCard
      title="Treemap"
      description="Squarified layout — area exactly proportional to value"
      badges={['squarify', 'hover']}
    >
      <Treemap
        data={treemap}
        theme={theme} animate={animate} legendPosition="none"
        title="Cloud spend breakdown"
      />
    </ChartCard>
  );
}

function WaterfallDemo({ theme, animate }: any) {
  return (
    <ChartCard
      title="Waterfall"
      description="Running totals with theme positive/negative semantic colours"
      badges={['theme.positive', 'theme.negative']}
    >
      <Waterfall
        data={waterfall}
        theme={theme} animate={animate} legendPosition="none"
        title="Quarterly cash flow"
      />
    </ChartCard>
  );
}

// ─── Distribution ─────────────────────────────────────────

function ScatterDemo({ theme, animate, legendPos }: any) {
  return (
    <ChartCard
      title="Cluster scatter"
      description="180 points × 3 groups, quadtree-accelerated nearest-point hover"
      badges={['quadtree O(log n)', 'grouped series']}
      height={360}
    >
      <Scatter
        data={scatterClusters}
        mapping={{ x: 'x', y: 'y', groupField: 'group', sizeField: 'size', labelField: 'label' }}
        theme={theme} animate={animate} legendPosition={legendPos}
        title="3-cluster distribution"
      />
    </ChartCard>
  );
}

function RadarDemo({ theme, animate, legendPos }: any) {
  return (
    <ChartCard
      title="Capability radar"
      description="Two series, 6 axes — overlay polygons with filled regions"
      badges={['multi-series']}
    >
      <Radar
        data={skills}
        mapping={{ x: 'axis', y: ['a', 'b'], seriesNames: ['SwiftChart', 'Baseline'] }}
        theme={theme} animate={animate} legendPosition={legendPos}
        title="Library comparison"
      />
    </ChartCard>
  );
}

// ─── KPIs / sparklines ────────────────────────────────────

function GaugeDemo({ theme, animate }: any) {
  const [v, setV] = useState(42);
  const [auto, setAuto] = useState(true);
  useEffect(() => {
    if (!auto) return;
    const id = setInterval(() => setV(20 + Math.random() * 70), 1500);
    return () => clearInterval(id);
  }, [auto]);
  return (
    <ChartCard
      title="Gauge"
      description="Smooth needle tween between values; tick marks at segment boundaries"
      badges={['live update', 'segments']}
      controls={(
        <Inline gap="4" align="center">
          <Switch checked={auto} onCheckedChange={setAuto}>Auto</Switch>
          {!auto && (
            <Box width="180px">
              <Slider
                value={v} onChange={(val) => setV(typeof val === 'number' ? val : val[0])}
                minValue={0} maxValue={100} step={1}
                aria-label="Server load"
                size="sm"
              />
            </Box>
          )}
        </Inline>
      )}
    >
      <Gauge
        value={Math.round(v)} min={0} max={100}
        theme={theme} animate={animate}
        title="Server load"
        ariaLabel={`Server load: ${Math.round(v)} percent`}
      />
    </ChartCard>
  );
}

function SparklineRow({ theme, animate }: any) {
  const series = useMemo(() => [
    { label: 'CPU',    color: '#38bdf8', filled: true,  data: Array.from({ length: 40 }, (_, i) => 30 + Math.sin(i / 3) * 10 + Math.random() * 6) },
    { label: 'RAM',    color: '#a78bfa', filled: true,  data: Array.from({ length: 40 }, (_, i) => 60 + Math.cos(i / 5) * 8 + Math.random() * 4) },
    { label: 'Reqs/s', color: '#34d399', filled: false, data: Array.from({ length: 40 }, () => Math.random() * 100) },
    { label: 'Errors', color: '#fb7185', filled: false, data: Array.from({ length: 40 }, () => Math.random() * 5) },
  ], []);
  return (
    <ChartCard
      title="Sparklines"
      description="40-point inline mini-lines — drop into tables or status rows"
      badges={['filled / unfilled', 'no axes']}
      height={220}
    >
      <Stack gap="2">
        {series.map(s => (
          <Grid key={s.label} templateColumns="80px 1fr 60px" align="center" gap="3">
            <Text size="sm" color="fg.muted">{s.label}</Text>
            <SparklineComponent
              data={s.data} color={s.color} filled={s.filled}
              theme={theme} animate={animate} height={36}
            />
            <Code size="sm" style={{ textAlign: 'right' }}>
              {s.data[s.data.length - 1].toFixed(1)}
            </Code>
          </Grid>
        ))}
      </Stack>
    </ChartCard>
  );
}

// ─── Advanced ─────────────────────────────────────────────

function BigDataDemo({ theme, animate }: any) {
  const [n, setN] = useState(10_000);
  const [t0, setT0] = useState(0);
  const data = useMemo(() => {
    const start = performance.now();
    const d = bigSeries(n);
    queueMicrotask(() => setT0(performance.now() - start));
    return d;
  }, [n]);
  return (
    <ChartCard
      title={`${n.toLocaleString()} points`}
      description={`LTTB downsamples to ~viewport-pixel-count buckets · synth ${t0.toFixed(1)} ms`}
      badges={['LTTB', 'viewport culling']}
      height={360}
      controls={(
        <RadioGroup
          value={String(n)}
          onValueChange={(v) => setN(+v)}
          orientation="horizontal"
          aria-label="Big-data point count"
        >
          <Inline gap="4" align="center">
            {[1000, 10_000, 100_000, 500_000].map(v => (
              <Radio key={v} value={String(v)}>{v.toLocaleString()}</Radio>
            ))}
          </Inline>
        </RadioGroup>
      )}
    >
      <Line
        data={data}
        mapping={{ x: 'x', y: 'v' }}
        theme={theme} animate={animate}
        dots={false} smooth={false}
        title="LTTB-downsampled signal"
      />
    </ChartCard>
  );
}

function StreamingDemo({ theme }: { theme: ThemeName }) {
  const [snap, setSnap] = useState({
    labels: [] as string[],
    datasets: [
      { label: 'p50', data: [] as number[] },
      { label: 'p99', data: [] as number[] },
    ],
  });
  useEffect(() => {
    const ds = new StreamDataset(['p50', 'p99'], 120);
    let i = 0;
    const id = setInterval(() => {
      const p50 = 80 + Math.sin(i / 5) * 20 + Math.random() * 10;
      const p99 = p50 + 60 + Math.random() * 40;
      ds.push(`t${i++}`, { p50, p99 });
      setSnap(ds.toResolvedData());
    }, 200);
    return () => clearInterval(id);
  }, []);
  return (
    <ChartCard
      title="Streaming"
      description="StreamDataset ring buffer — push at 5 Hz with 120-pt rolling window"
      badges={['StreamDataset', '5 Hz', 'rolling window']}
    >
      <Line
        mapping={{ labels: snap.labels, datasets: snap.datasets }}
        theme={theme}
        animate={false}
        dots={false}
        title="Latency p50 / p99"
      />
    </ChartCard>
  );
}

function RefDemo({ theme, animate }: any) {
  const ref = useRef<ChartRef>(null);
  const [png, setPng] = useState<string | null>(null);
  return (
    <ChartCard
      title="Imperative API"
      description="ChartRef.toDataURL() · .resize() · .chart.update({ ... })"
      badges={['ref', 'PNG export', 'runtime config']}
      controls={(
        <Inline gap="2">
          <Button variant="soft" size="sm" onClick={() => ref.current?.resize()}>Resize</Button>
          <Button variant="soft" size="sm" onClick={() => setPng(ref.current?.toDataURL() ?? null)}>Export PNG</Button>
          <Button variant="soft" size="sm" onClick={() => ref.current?.chart?.update({
            title: 'Updated at ' + new Date().toLocaleTimeString(),
          })}>Update title</Button>
        </Inline>
      )}
    >
      <Bar
        ref={ref}
        data={monthlySales}
        mapping={{ x: 'month', y: 'revenue' }}
        theme={theme} animate={animate}
        title="Sales"
      />
      {png && (
        <Box position="absolute" right="3" bottom="3">
          <a href={png} download="chart.png" style={{ fontSize: 12, color: 'var(--cyn-color-accent-text)' }}>
            ↓ Download PNG ({Math.round(png.length / 1024)} KB)
          </a>
        </Box>
      )}
    </ChartCard>
  );
}

// ─── Security ─────────────────────────────────────────────

function XSSDemo({ theme, animate }: any) {
  return (
    <ChartCard
      title="XSS hardening"
      description="Hostile labels are rendered as text only — inspect the tooltip in DevTools"
      badges={['DOM textContent', 'no innerHTML']}
    >
      <Bar
        data={xssData}
        mapping={{ x: 'label', y: 'value' }}
        theme={theme} animate={animate}
        title="Labels containing <script> / onerror"
        legendPosition="none"
      />
    </ChartCard>
  );
}
