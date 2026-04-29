export const monthlySales = [
  { month: 'Jan', revenue: 420, target: 400, cost: 280 },
  { month: 'Feb', revenue: 510, target: 450, cost: 320 },
  { month: 'Mar', revenue: 480, target: 500, cost: 340 },
  { month: 'Apr', revenue: 620, target: 550, cost: 380 },
  { month: 'May', revenue: 700, target: 600, cost: 410 },
  { month: 'Jun', revenue: 760, target: 650, cost: 440 },
  { month: 'Jul', revenue: 820, target: 700, cost: 480 },
  { month: 'Aug', revenue: 890, target: 750, cost: 520 },
  { month: 'Sep', revenue: 760, target: 800, cost: 540 },
  { month: 'Oct', revenue: 940, target: 850, cost: 580 },
  { month: 'Nov', revenue: 1020, target: 900, cost: 620 },
  { month: 'Dec', revenue: 1180, target: 1000, cost: 700 },
];

export const traffic = [
  { source: 'Organic Search', visits: 4200 },
  { source: 'Direct', visits: 3100 },
  { source: 'Social', visits: 1800 },
  { source: 'Referral', visits: 1100 },
  { source: 'Email', visits: 800 },
  { source: 'Paid Ads', visits: 600 },
];

export const regionPnL = [
  { region: 'NA', pnl: 240 },
  { region: 'EU', pnl: 180 },
  { region: 'APAC', pnl: -60 },
  { region: 'LATAM', pnl: -30 },
  { region: 'MEA', pnl: 90 },
];

export const skills = [
  { axis: 'Speed', a: 90, b: 70 },
  { axis: 'Accuracy', a: 80, b: 90 },
  { axis: 'Stability', a: 95, b: 60 },
  { axis: 'Memory', a: 70, b: 85 },
  { axis: 'API', a: 88, b: 75 },
  { axis: 'Docs', a: 60, b: 80 },
];

export const scatterClusters = (() => {
  const out: { x: number; y: number; group: string; size: number; label: string }[] = [];
  const groups = ['α', 'β', 'γ'];
  groups.forEach((g, gi) => {
    const cx = 30 + gi * 25;
    const cy = 40 + gi * 15;
    let seed = gi * 1000 + 1;
    const rand = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
    for (let i = 0; i < 60; i++) {
      const ang = rand() * Math.PI * 2;
      const r = Math.pow(rand(), 2) * 18;
      out.push({
        x: cx + Math.cos(ang) * r,
        y: cy + Math.sin(ang) * r,
        group: g,
        size: 4 + rand() * 6,
        label: `${g}-${i}`,
      });
    }
  });
  return out;
})();

export const waterfall = [
  { label: 'Q1', value: 120 },
  { label: 'Q2 Δ', value: 45 },
  { label: 'Q3 Δ', value: -22 },
  { label: 'Q4 Δ', value: 67 },
  { label: 'Tax', value: -38 },
  { label: 'Net', value: 0 },
];

export const treemap = [
  { name: 'Compute', value: 42 },
  { name: 'Storage', value: 28 },
  { name: 'Network', value: 18 },
  { name: 'Logging', value: 9 },
  { name: 'Security', value: 7 },
  { name: 'Backups', value: 5 },
  { name: 'Misc', value: 3 },
];

export const stacked = [
  { day: 'Mon', api: 80, web: 120, mobile: 60 },
  { day: 'Tue', api: 95, web: 140, mobile: 80 },
  { day: 'Wed', api: 110, web: 160, mobile: 100 },
  { day: 'Thu', api: 100, web: 180, mobile: 110 },
  { day: 'Fri', api: 130, web: 220, mobile: 140 },
  { day: 'Sat', api: 70, web: 130, mobile: 90 },
  { day: 'Sun', api: 60, web: 110, mobile: 70 },
];

export const sparklineSeries = [
  120, 132, 128, 140, 138, 152, 160, 155, 168, 172, 165, 180, 195, 210,
];

export const gaugeValue = 72;

// ─── Bubble (correlated x/y/size by region) ──────────────────────────────
export const gdpHealth = [
  { country: 'Norway',    gdp: 78, life: 83, pop: 5,   region: 'EU' },
  { country: 'Germany',   gdp: 51, life: 81, pop: 84,  region: 'EU' },
  { country: 'Spain',     gdp: 32, life: 84, pop: 47,  region: 'EU' },
  { country: 'USA',       gdp: 76, life: 79, pop: 333, region: 'NA' },
  { country: 'Canada',    gdp: 53, life: 82, pop: 39,  region: 'NA' },
  { country: 'Japan',     gdp: 42, life: 84, pop: 125, region: 'Asia' },
  { country: 'India',     gdp: 8,  life: 70, pop: 1430, region: 'Asia' },
  { country: 'Brazil',    gdp: 11, life: 75, pop: 215, region: 'LATAM' },
  { country: 'Argentina', gdp: 13, life: 76, pop: 46,  region: 'LATAM' },
  { country: 'S. Africa', gdp: 7,  life: 64, pop: 60,  region: 'Africa' },
];

// ─── Heatmap (24×7 web traffic) ──────────────────────────────────────────
export const trafficGrid = (() => {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const out: { hour: string; day: string; visits: number }[] = [];
  for (let d = 0; d < days.length; d++) {
    for (let h = 0; h < 24; h++) {
      const business = h >= 9 && h < 18 ? 1 : 0.4;
      const weekend = d >= 5 ? 0.7 : 1.1;
      const noise = Math.sin(h * 0.7 + d) * 0.2 + 1;
      out.push({
        hour: String(h).padStart(2, '0'),
        day: days[d],
        visits: Math.round(40 * business * weekend * noise + 10),
      });
    }
  }
  return out;
})();

// ─── Candlestick (30 sessions of synthetic OHLC) ─────────────────────────
export const candleSeries = (() => {
  const out: { date: string; open: number; high: number; low: number; close: number }[] = [];
  let price = 100;
  let seed = 7;
  const rand = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280 - 0.5; };
  for (let i = 0; i < 30; i++) {
    const open = price;
    const close = open + rand() * 6;
    const high = Math.max(open, close) + Math.abs(rand()) * 3;
    const low = Math.min(open, close) - Math.abs(rand()) * 3;
    out.push({
      date: `D${i + 1}`,
      open: +open.toFixed(2),
      close: +close.toFixed(2),
      high: +high.toFixed(2),
      low: +low.toFixed(2),
    });
    price = close;
  }
  return out;
})();

// ─── Boxplot (latency by service) ────────────────────────────────────────
export const latencyBoxes = [
  { label: 'auth',     min: 12, q1: 18, median: 22, q3: 28, max: 38, outliers: [55, 62] },
  { label: 'db-read',  min: 8,  q1: 14, median: 19, q3: 24, max: 31, outliers: [44] },
  { label: 'db-write', min: 22, q1: 36, median: 48, q3: 64, max: 82, outliers: [110] },
  { label: 'search',   min: 18, q1: 26, median: 33, q3: 41, max: 58, outliers: [] },
  { label: 'render',   min: 6,  q1: 9,  median: 12, q3: 15, max: 21, outliers: [] },
];

// ─── Funnel (signup conversion) ──────────────────────────────────────────
export const conversionFunnel = [
  { stage: 'Visited',     value: 12000 },
  { stage: 'Signed up',   value: 4800 },
  { stage: 'Activated',   value: 2200 },
  { stage: 'Subscribed',  value: 720 },
  { stage: 'Renewed',     value: 480 },
];

// ─── Sankey (energy flow) ────────────────────────────────────────────────
export const energyFlow = {
  nodes: [
    { id: 'Oil' }, { id: 'Gas' }, { id: 'Coal' }, { id: 'Renewables' },
    { id: 'Industry' }, { id: 'Residential' }, { id: 'Transport' }, { id: 'Loss' },
  ],
  links: [
    { source: 'Oil',  target: 'Industry',    value: 30 },
    { source: 'Oil',  target: 'Transport',   value: 50 },
    { source: 'Gas',  target: 'Industry',    value: 25 },
    { source: 'Gas',  target: 'Residential', value: 20 },
    { source: 'Coal', target: 'Industry',    value: 35 },
    { source: 'Coal', target: 'Loss',        value: 10 },
    { source: 'Renewables', target: 'Residential', value: 18 },
    { source: 'Renewables', target: 'Industry',    value: 12 },
  ],
};

// ─── Bullet (KPIs) ───────────────────────────────────────────────────────
export const kpiBullets = [
  { label: 'Revenue',  value: 84,  target: 90,  ranges: [60, 80, 100] },
  { label: 'Profit',   value: 32,  target: 40,  ranges: [20, 35, 50] },
  { label: 'NPS',      value: 56,  target: 60,  ranges: [30, 50, 80] },
  { label: 'Churn %',  value: 4.5, target: 3,   ranges: [2, 4, 6] },
];

// ─── Network graph (small social) ────────────────────────────────────────
export const socialGraph = {
  nodes: [
    { id: 'A', group: 1, size: 10 }, { id: 'B', group: 1, size: 8 },
    { id: 'C', group: 1, size: 7 },  { id: 'D', group: 2, size: 9 },
    { id: 'E', group: 2, size: 6 },  { id: 'F', group: 2, size: 6 },
    { id: 'G', group: 3, size: 8 },  { id: 'H', group: 3, size: 7 },
    { id: 'I', group: 3, size: 5 },  { id: 'J', group: 4, size: 7 },
    { id: 'K', group: 4, size: 5 },
  ],
  links: [
    { source: 'A', target: 'B' }, { source: 'A', target: 'C' },
    { source: 'B', target: 'C' }, { source: 'C', target: 'D' },
    { source: 'D', target: 'E' }, { source: 'D', target: 'F' },
    { source: 'E', target: 'F' }, { source: 'F', target: 'G' },
    { source: 'G', target: 'H' }, { source: 'G', target: 'I' },
    { source: 'H', target: 'I' }, { source: 'I', target: 'J' },
    { source: 'J', target: 'K' }, { source: 'A', target: 'G' },
  ],
};

// ─── Marimekko (revenue split) ───────────────────────────────────────────
export const segmentRevenue = [
  { segment: 'Enterprise', premium: 320, plus: 180, free: 80 },
  { segment: 'SMB',        premium: 140, plus: 220, free: 260 },
  { segment: 'Consumer',   premium: 60,  plus: 140, free: 480 },
  { segment: 'Education',  premium: 30,  plus: 60,  free: 280 },
];
