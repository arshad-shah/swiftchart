import {
  Stack, Inline, Grid, Box, Divider,
  Heading, Text, Code,
  Card, CardHeader, CardBody, CardTitle, CardDescription,
  Tabs, TabsList, TabsTrigger, TabsContent,
  Accordion, AccordionItem, AccordionTrigger, AccordionContent,
  Badge,
  Table, TableHead, TableBody, TableRow, TableHeader, TableCell,
} from '@arshad-shah/cynosure-react';
import { CodeBlock } from '@arshad-shah/cynosure-react/code-block';
import { useEffect, useId, useState, type ReactNode } from 'react';

// ─── Code helpers ─────────────────────────────────────────

interface Example {
  label: string;        // tab label, e.g. "pnpm" / "Vanilla JS"
  language: string;     // shiki language tag
  code: string;
  filename?: ReactNode; // optional filename shown in CodeBlock header
}

function CodeExamples({ examples }: { examples: Example[] }) {
  const id = useId();
  if (examples.length === 1) {
    const e = examples[0];
    return <CodeBlock language={e.language} copyable filename={e.filename}>{e.code}</CodeBlock>;
  }
  const first = examples[0].label;
  return (
    <Tabs defaultValue={first} variant="soft" size="sm" colorScheme="neutral">
      <TabsList aria-label={`Code examples for ${id}`}>
        {examples.map(e => (
          <TabsTrigger key={e.label} value={e.label}>{e.label}</TabsTrigger>
        ))}
      </TabsList>
      {examples.map(e => (
        <TabsContent key={e.label} value={e.label}>
          <Box marginTop="2">
            <CodeBlock language={e.language} copyable filename={e.filename}>
              {e.code}
            </CodeBlock>
          </Box>
        </TabsContent>
      ))}
    </Tabs>
  );
}

// ─── Section wrapper ──────────────────────────────────────

function DocSection({
  id, title, description, children,
}: { id: string; title: string; description?: string; children: ReactNode }) {
  return (
    <Card variant="elevated" id={id}>
      <CardHeader>
        <Stack gap="1">
          <CardTitle as="h3">{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </Stack>
      </CardHeader>
      <CardBody>{children}</CardBody>
    </Card>
  );
}

// ─── Top-level layout ─────────────────────────────────────

export function Docs() {
  return (
    <Box marginTop="6" className="docs-layout">
      <aside className="docs-sidebar">
        <TOC />
      </aside>
      <Stack gap="6" className="docs-main">
        <Install />
        <QuickStart />
        <ChartTypes />
        <Theming />
        <Performance />
        <Accessibility />
        <APIReference />
        <SSRFAQ />
      </Stack>
    </Box>
  );
}

const TOC_ITEMS: Array<{ id: string; label: string }> = [
  { id: 'install',      label: 'Install' },
  { id: 'quickstart',   label: 'Quick start' },
  { id: 'chart-types',  label: 'Chart types' },
  { id: 'theming',      label: 'Theming' },
  { id: 'performance',  label: 'Performance' },
  { id: 'a11y',         label: 'Accessibility' },
  { id: 'api',          label: 'API reference' },
  { id: 'ssr',          label: 'FAQ' },
];

function useActiveSection(ids: string[]): string {
  const [active, setActive] = useState<string>(ids[0] ?? '');
  useEffect(() => {
    let raf = 0;
    const ACTIVATION_OFFSET = 120; // px from viewport top — section becomes active once its top crosses this line

    const compute = () => {
      raf = 0;
      let current = ids[0];
      for (const id of ids) {
        const el = document.getElementById(id);
        if (!el) continue;
        const top = el.getBoundingClientRect().top;
        if (top - ACTIVATION_OFFSET <= 0) current = id;
        else break; // sections are in document order — stop at first one below the line
      }
      setActive(prev => (prev === current ? prev : current));
    };

    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(compute);
    };

    compute();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids.join('|')]);
  return active;
}

function TOC() {
  const active = useActiveSection(TOC_ITEMS.map(i => i.id));
  return (
    <nav aria-label="Documentation contents" className="docs-toc">
      <div className="docs-toc-eyebrow">
        <span className="docs-toc-dot" aria-hidden="true" />
        On this page
      </div>
      <ol className="docs-toc-list">
        {TOC_ITEMS.map((item, i) => {
          const isActive = active === item.id;
          return (
            <li key={item.id} className="docs-toc-item">
              <a
                href={`#${item.id}`}
                className={`docs-toc-link${isActive ? ' is-active' : ''}`}
                aria-current={isActive ? 'location' : undefined}
              >
                <span className="docs-toc-num">{String(i + 1).padStart(2, '0')}</span>
                <span className="docs-toc-label">{item.label}</span>
              </a>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

// ─── Sections ─────────────────────────────────────────────

function Install() {
  return (
    <DocSection id="install" title="Install" description="Pick your package manager.">
      <Stack gap="3">
        <CodeExamples examples={[
          { label: 'pnpm', language: 'bash', code: 'pnpm add swiftchart' },
          { label: 'npm',  language: 'bash', code: 'npm install swiftchart' },
          { label: 'yarn', language: 'bash', code: 'yarn add swiftchart' },
          { label: 'bun',  language: 'bash', code: 'bun add swiftchart' },
        ]} />
        <Text size="sm" color="fg.muted">
          React is an <em>optional</em> peer dependency — only required when importing{' '}
          <Code>swiftchart/react</Code>. Vanilla usage has zero runtime dependencies.
        </Text>
      </Stack>
    </DocSection>
  );
}

function QuickStart() {
  return (
    <DocSection id="quickstart" title="Quick start" description="Render a chart in three lines.">
      <Stack gap="4">
        <CodeExamples examples={[
          {
            label: 'React', language: 'tsx', filename: 'Dashboard.tsx',
            code: `import { Line, Bar, Donut } from 'swiftchart/react';

export function Dashboard() {
  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <Line
        data={salesData}
        mapping={{ x: 'month', y: ['revenue', 'target'] }}
        theme="midnight"
        height={300}
        area
      />
      <Bar
        data={regionData}
        mapping={{ x: 'region', y: 'sales' }}
        height={300}
      />
      <Donut
        data={trafficData}
        mapping={{ labelField: 'source', valueField: 'visits' }}
        height={300}
      />
    </div>
  );
}`,
          },
          {
            label: 'Vanilla JS', language: 'ts', filename: 'chart.ts',
            code: `import { LineChart } from 'swiftchart';

const chart = new LineChart('#my-chart', {
  title: 'Revenue',
  theme: 'midnight',
  area: true,
});

// Pass any data shape — SwiftChart auto-detects fields.
chart.setData(apiResponse, { x: 'date', y: 'revenue' });`,
          },
        ]} />

        <Divider tone="subtle" />
        <Heading level={4} size="sm">Schema-agnostic data</Heading>
        <CodeExamples examples={[
          {
            label: 'Auto-detect', language: 'ts',
            code: `// String field → labels, number fields → series.
chart.setData([
  { month: 'Jan', sales: 420, cost: 280 },
  { month: 'Feb', sales: 510, cost: 320 },
]);`,
          },
          {
            label: 'Explicit mapping', language: 'ts',
            code: `chart.setData(data, {
  x: 'timestamp',
  y: ['cpu', 'mem'],
  seriesNames: ['CPU', 'Memory'],
});`,
          },
          {
            label: 'Pre-built', language: 'ts',
            code: `chart.setData([], {
  labels: ['Q1', 'Q2', 'Q3'],
  datasets: [{ label: 'Revenue', data: [100, 200, 350] }],
});`,
          },
        ]} />
      </Stack>
    </DocSection>
  );
}

function ChartTypes() {
  const rows: Array<[string, string, string, string]> = [
    ['Line',           'LineChart',        'Line',                 'Smooth or straight, optional dots'],
    ['Area',           'LineChart (area)', 'Area',                 'Line with gradient fill'],
    ['Bar',            'BarChart',         'Bar',                  'Vertical, grouped multi-series'],
    ['Horizontal bar', 'HBarChart',        'HBar',                 'Long category labels'],
    ['Pie',            'PieChart',         'Pie',                  'Schema-agnostic'],
    ['Donut',          'PieChart (donut)', 'Donut',                'Center read-out on hover'],
    ['Scatter',        'ScatterChart',     'Scatter',              'Quadtree-accelerated hover'],
    ['Radar',          'RadarChart',       'Radar',                'Multi-series capability map'],
    ['Gauge',          'GaugeChart',       'Gauge',                'Smooth needle tween'],
    ['Sparkline',      'Sparkline',        'SparklineComponent',   'Inline 40-pt mini-line'],
    ['Stacked area',   'StackedAreaChart', 'StackedArea',          'Running totals in tooltip'],
    ['Waterfall',      'WaterfallChart',   'Waterfall',            'Theme positive/negative deltas'],
    ['Treemap',        'TreemapChart',     'Treemap',              'Squarified, area-proportional'],
  ];
  return (
    <DocSection id="chart-types" title="Chart types">
      <Box style={{ overflowX: 'auto' }}>
        <Table size="sm" variant="line">
          <TableHead>
            <TableRow>
              <TableHeader>Type</TableHeader>
              <TableHeader>Vanilla import</TableHeader>
              <TableHeader>React component</TableHeader>
              <TableHeader>Notes</TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map(([type, vanilla, react, notes]) => (
              <TableRow key={type}>
                <TableCell><Text weight="medium">{type}</Text></TableCell>
                <TableCell><Code size="sm">{vanilla}</Code></TableCell>
                <TableCell><Code size="sm">&lt;{react}/&gt;</Code></TableCell>
                <TableCell><Text size="sm" color="fg.muted">{notes}</Text></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Box>
    </DocSection>
  );
}

function Theming() {
  return (
    <DocSection id="theming" title="Theming" description="Four built-ins, plus unlimited custom themes.">
      <Stack gap="3">
        <Inline gap="2">
          {(['midnight', 'arctic', 'ember', 'forest'] as const).map(t => (
            <Badge key={t} variant="soft" colorScheme="neutral">{t}</Badge>
          ))}
        </Inline>
        <CodeExamples examples={[
          {
            label: 'Custom theme', language: 'ts',
            code: `import { addTheme, LineChart } from 'swiftchart';

addTheme('neon', {
  bg:        '#0a0a0f',
  surface:   '#111118',
  grid:      '#ffffff10',
  text:      '#e0e0ff',
  textMuted: '#6060a0',
  axis:      '#2a2a4a',
  positive:  '#86efac', // semantic — used by Waterfall etc.
  negative:  '#fb7185',
  onAccent:  '#0a0014', // fg colour drawn on top of accent fills
  colors:    ['#ff00ff', '#00ffff', '#ffff00', '#ff6600'],
});

new LineChart('#x', { theme: 'neon' });`,
          },
          {
            label: 'Built-in', language: 'tsx',
            code: `<Line theme="midnight" />  // default
<Line theme="arctic"  />  // light
<Line theme="ember"   />  // warm dark
<Line theme="forest"  />  // green dark`,
          },
          {
            label: 'Runtime switch', language: 'tsx',
            code: `import { useState } from 'react';
import { Line } from 'swiftchart/react';

function Chart() {
  const [theme, setTheme] = useState<'midnight' | 'arctic'>('midnight');
  return (
    <>
      <button onClick={() => setTheme(t => t === 'midnight' ? 'arctic' : 'midnight')}>
        Toggle
      </button>
      <Line theme={theme} data={data} mapping={mapping} />
    </>
  );
}`,
          },
        ]} />
        <Text size="sm" color="fg.muted">
          Every chart respects <Code>theme.positive</Code>, <Code>theme.negative</Code>{' '}
          and <Code>theme.onAccent</Code> — no more white-on-white in light themes.
        </Text>
      </Stack>
    </DocSection>
  );
}

function Performance() {
  return (
    <DocSection id="performance" title="Performance" description="Designed to render 100K+ points without breaking a sweat.">
      <Grid templateColumns="repeat(auto-fit, minmax(240px, 1fr))" gap="4">
        <PerfCard title="LTTB downsampling">
          100K → ~viewport-pixel-count buckets in <Code size="sm">~0.4 ms</Code>.
          Preserves visual shape; first/last points exact.
        </PerfCard>
        <PerfCard title="Quadtree hover">
          Nearest-point lookup at 50K points: <Code size="sm">~0.5 ms</Code> vs{' '}
          <Code size="sm">~50 ms</Code> linear — <strong>100× speedup</strong>.
        </PerfCard>
        <PerfCard title="Viewport culling">
          Binary-search visible range over sorted-X data:{' '}
          <Code size="sm">~960× faster</Code> than linear filter.
        </PerfCard>
        <PerfCard title="Streaming ring buffer">
          <Code size="sm">StreamBuffer</Code> / <Code size="sm">StreamDataset</Code>{' '}
          — 100K pushes in <Code size="sm">~1 ms</Code>, no realloc.
        </PerfCard>
      </Grid>
      <Box marginTop="4">
        <CodeExamples examples={[
          {
            label: 'Streaming', language: 'tsx',
            code: `import { useEffect, useState } from 'react';
import { Line } from 'swiftchart/react';
import { StreamDataset } from 'swiftchart';

function LiveLatency() {
  const [snap, setSnap] = useState({ labels: [] as string[], datasets: [] as any[] });
  useEffect(() => {
    const ds = new StreamDataset(['p50', 'p99'], 120);
    let i = 0;
    const id = setInterval(() => {
      ds.push(\`t\${i++}\`, { p50: Math.random() * 100, p99: Math.random() * 200 });
      setSnap(ds.toResolvedData());
    }, 200);
    return () => clearInterval(id);
  }, []);
  return <Line mapping={snap} animate={false} dots={false} />;
}`,
          },
          {
            label: 'Big data', language: 'tsx',
            code: `import { Line } from 'swiftchart/react';

// SwiftChart will internally LTTB-downsample to viewport-pixel-count
// buckets; you can also pass downsampleTarget on the chart instance.
<Line
  data={hundredThousandPoints}
  mapping={{ x: 'x', y: 'v' }}
  dots={false}
  smooth={false}
/>`,
          },
        ]} />
      </Box>
    </DocSection>
  );
}

function PerfCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card variant="filled" size="sm">
      <CardBody>
        <Stack gap="1">
          <Heading level={4} size="sm">{title}</Heading>
          <Text size="sm" color="fg.muted">{children}</Text>
        </Stack>
      </CardBody>
    </Card>
  );
}

function Accessibility() {
  return (
    <DocSection id="a11y" title="Accessibility">
      <Stack gap="3">
        <Text>
          Every chart canvas is given <Code>role=&quot;img&quot;</Code> and{' '}
          <Code>tabIndex=0</Code>, with an <Code>aria-label</Code> sourced from the{' '}
          <Code>ariaLabel</Code> prop (or <Code>title</Code> as a fallback).
        </Text>
        <CodeExamples examples={[
          {
            label: 'aria-label', language: 'tsx',
            code: `<Line
  data={data}
  ariaLabel="Monthly revenue versus target"
  ariaDescription="Two line series across 12 months."
  title="Revenue vs Target"
/>`,
          },
          {
            label: 'XSS-safe tooltips', language: 'ts',
            code: `// Tooltips are rendered via DOM construction with textContent
// for user-supplied fields — markup in labels can't escape into
// the tooltip panel. Server-supplied labels are safe by default.
chart.setData([
  { label: '<script>alert(1)</script>', value: 30 },
  { label: '<img src=x onerror=alert(2)>', value: 45 },
]);`,
          },
        ]} />
      </Stack>
    </DocSection>
  );
}

function APIReference() {
  return (
    <DocSection id="api" title="API reference (excerpt)" description="Most-used surface; full TypeScript types ship with the package.">
      <CodeExamples examples={[
        {
          label: 'BaseChartConfig', language: 'ts',
          code: `interface BaseChartConfig {
  theme?: ThemeName | Theme;
  animate?: boolean;          // default: true
  animDuration?: number;      // default: 600 ms
  animEasing?: EasingName;    // default: 'easeOutCubic'
  responsive?: boolean;       // default: true
  padding?: Partial<Padding>;
  showGrid?: boolean;
  showTooltip?: boolean;
  showLegend?: boolean;
  legendPosition?: 'top' | 'bottom' | 'left' | 'right' | 'none';
  title?: string;
  subtitle?: string;
  formatValue?: (v: number) => string;
  onClick?: (index: number, data: ResolvedData) => void;
  ariaLabel?: string;
  ariaDescription?: string;
}`,
        },
        {
          label: 'Imperative', language: 'ts',
          code: `chart.setData(data, mapping?)
chart.setTheme(name)
chart.update(patchOrData, mapping?)   // polymorphic
chart.resize()
chart.toDataURL(type?, quality?)      // PNG export
chart.destroy()`,
        },
        {
          label: 'React ref', language: 'tsx',
          code: `import { useRef } from 'react';
import { Line, type ChartRef } from 'swiftchart/react';

function MyChart() {
  const ref = useRef<ChartRef>(null);
  return (
    <>
      <Line ref={ref} data={data} mapping={mapping} />
      <button onClick={() => ref.current?.resize()}>Resize</button>
      <button onClick={() => {
        const url = ref.current?.toDataURL();
        if (url) window.open(url);
      }}>Export PNG</button>
    </>
  );
}`,
        },
      ]} />
    </DocSection>
  );
}

function SSRFAQ() {
  const items: Array<{ q: string; a: ReactNode }> = [
    {
      q: 'Does it work with Next.js / Remix / TanStack Start?',
      a: (
        <Text size="sm" color="fg.muted">
          Yes — the React entry ships with a <Code>&quot;use client&quot;</Code> directive
          so it&apos;s skipped during the server pass. Constructing a chart in a server
          context throws a clear error.
        </Text>
      ),
    },
    {
      q: 'Can I extend with my own chart type?',
      a: (
        <Text size="sm" color="fg.muted">
          Yes — subclass <Code>BaseChart</Code> and implement <Code>_draw()</Code> and{' '}
          <Code>_onMouse()</Code>. The <Code>BaseChart</Code> protected helpers
          (<Code>_drawGrid</Code>, <Code>_drawXLabels</Code>, <Code>_drawCrosshair</Code>,{' '}
          <Code>_tooltipContent</Code>) cover most of what cartesian charts need.
        </Text>
      ),
    },
    {
      q: 'How big is the bundle?',
      a: (
        <Text size="sm" color="fg.muted">
          Core: <Code>~12 KB gzip</Code>. React entry: <Code>~12 KB gzip</Code> (re-bundles
          the core graph for downstream tree-shaking — there&apos;s no global runtime cost
          if you only need vanilla).
        </Text>
      ),
    },
    {
      q: 'Why Canvas 2D instead of WebGL or SVG?',
      a: (
        <Text size="sm" color="fg.muted">
          Canvas 2D ships in every browser since 2010 with no DOM-per-point overhead, so
          100K-point charts render at 60 fps without external dependencies. WebGL is
          worth the complexity above ~1M points; SVG below ~500.
        </Text>
      ),
    },
    {
      q: 'Is it accessible?',
      a: (
        <Text size="sm" color="fg.muted">
          Each chart canvas exposes <Code>role=&quot;img&quot;</Code>, a focusable{' '}
          <Code>tabIndex=0</Code>, and an <Code>aria-label</Code> from the{' '}
          <Code>ariaLabel</Code> prop. Tooltips set <Code>role=&quot;tooltip&quot;</Code>{' '}
          and toggle <Code>aria-hidden</Code>.
        </Text>
      ),
    },
    {
      q: 'How does theming work in light mode?',
      a: (
        <Text size="sm" color="fg.muted">
          Pass <Code>theme=&quot;arctic&quot;</Code> for the built-in light theme.
          Semantic colours (<Code>positive</Code>, <Code>negative</Code>,{' '}
          <Code>onAccent</Code>) ensure on-bar text and waterfall deltas don&apos;t go
          white-on-white.
        </Text>
      ),
    },
  ];
  return (
    <DocSection id="ssr" title="FAQ">
      <Accordion type="multiple" variant="default" size="md">
        {items.map((item, i) => (
          <AccordionItem key={i} value={`faq-${i}`}>
            <AccordionTrigger>{item.q}</AccordionTrigger>
            <AccordionContent>{item.a}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </DocSection>
  );
}
