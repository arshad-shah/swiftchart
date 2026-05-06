// Sample datasets, kept small and shape-varied to exercise the mapping API.

export const monthly = [
  { month: 'Jan', revenue: 120, cost: 80, target: 100, status: 'ok' },
  { month: 'Feb', revenue: 145, cost: 95, target: 110, status: 'ok' },
  { month: 'Mar', revenue: 132, cost: 88, target: 110, status: 'warn' },
  { month: 'Apr', revenue: 178, cost: 110, target: 120, status: 'ok' },
  { month: 'May', revenue: 162, cost: 102, target: 130, status: 'warn' },
  { month: 'Jun', revenue: 205, cost: 120, target: 140, status: 'ok' },
  { month: 'Jul', revenue: 230, cost: 140, target: 150, status: 'ok' },
  { month: 'Aug', revenue: 215, cost: 138, target: 150, status: 'warn' },
  { month: 'Sep', revenue: 248, cost: 150, target: 160, status: 'ok' },
  { month: 'Oct', revenue: 268, cost: 158, target: 170, status: 'ok' },
  { month: 'Nov', revenue: 295, cost: 165, target: 180, status: 'ok' },
  { month: 'Dec', revenue: 312, cost: 172, target: 190, status: 'ok' },
];

export const fruit = [
  { name: 'Apples', count: 42 },
  { name: 'Bananas', count: 31 },
  { name: 'Cherries', count: 18 },
  { name: 'Dates', count: 9 },
  { name: 'Elderberries', count: 5 },
];

export const scatterPoints = Array.from({ length: 60 }, (_, i) => ({
  x: i + Math.random() * 5,
  y: 50 + Math.sin(i / 4) * 30 + Math.random() * 10,
  size: 4 + (i % 5) * 2,
  group: i % 3 === 0 ? 'A' : i % 3 === 1 ? 'B' : 'C',
}));

export const radarSkills = [
  { axis: 'Speed', alice: 80, bob: 65 },
  { axis: 'Power', alice: 60, bob: 90 },
  { axis: 'Range', alice: 70, bob: 75 },
  { axis: 'Defense', alice: 85, bob: 50 },
  { axis: 'Magic', alice: 40, bob: 95 },
  { axis: 'Stamina', alice: 75, bob: 70 },
];

export const candles = [
  { label: 'Mon', open: 100, high: 110, low: 95, close: 108 },
  { label: 'Tue', open: 108, high: 115, low: 105, close: 112 },
  { label: 'Wed', open: 112, high: 113, low: 100, close: 102 },
  { label: 'Thu', open: 102, high: 108, low: 99, close: 106 },
  { label: 'Fri', open: 106, high: 120, low: 105, close: 118 },
];

export const boxplot = [
  { label: 'Q1', min: 10, q1: 25, median: 40, q3: 55, max: 70, outliers: [5, 80] },
  { label: 'Q2', min: 15, q1: 30, median: 45, q3: 60, max: 75 },
  { label: 'Q3', min: 20, q1: 32, median: 50, q3: 65, max: 78, outliers: [90] },
  { label: 'Q4', min: 12, q1: 28, median: 42, q3: 58, max: 72 },
];

export const funnelStages = [
  { stage: 'Visitors', users: 10000 },
  { stage: 'Sign-ups', users: 4200 },
  { stage: 'Trials', users: 1900 },
  { stage: 'Paid', users: 720 },
  { stage: 'Renewed', users: 410 },
];

export const sankeyNodes = [
  { id: 'src-a', label: 'Search' },
  { id: 'src-b', label: 'Social' },
  { id: 'src-c', label: 'Direct' },
  { id: 'mid', label: 'Landing' },
  { id: 'dst-a', label: 'Signup' },
  { id: 'dst-b', label: 'Bounce' },
];
export const sankeyLinks = [
  { source: 'src-a', target: 'mid', value: 50 },
  { source: 'src-b', target: 'mid', value: 30 },
  { source: 'src-c', target: 'mid', value: 20 },
  { source: 'mid', target: 'dst-a', value: 60 },
  { source: 'mid', target: 'dst-b', value: 40 },
];

export const networkNodes = [
  { id: 'a', label: 'Auth', group: 1 },
  { id: 'b', label: 'API', group: 1 },
  { id: 'c', label: 'DB', group: 2 },
  { id: 'd', label: 'Cache', group: 2 },
  { id: 'e', label: 'Worker', group: 3 },
  { id: 'f', label: 'Queue', group: 3 },
];
export const networkLinks = [
  { source: 'a', target: 'b' },
  { source: 'b', target: 'c' },
  { source: 'b', target: 'd' },
  { source: 'e', target: 'f' },
  { source: 'f', target: 'c' },
  { source: 'b', target: 'e' },
];

export const treemapItems = [
  { label: 'Engineering', value: 4200 },
  { label: 'Sales', value: 2800 },
  { label: 'Marketing', value: 1500 },
  { label: 'Support', value: 1100 },
  { label: 'Ops', value: 900 },
  { label: 'HR', value: 600 },
];

export const heatmap = Array.from({ length: 7 * 12 }, (_, i) => ({
  day: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i % 7],
  hour: String(Math.floor(i / 7)),
  value: Math.round(Math.random() * 100),
}));

export const bullets = [
  { label: 'Revenue', value: 270, target: 300, ranges: [150, 225, 300] },
  { label: 'Profit', value: 87, target: 90, ranges: [50, 75, 100] },
  { label: 'NPS', value: 62, target: 70, ranges: [30, 60, 100] },
];

export const waterfall = [
  { label: 'Start', value: 100 },
  { label: 'Sales', value: 60 },
  { label: 'Returns', value: -20 },
  { label: 'Costs', value: -35 },
  { label: 'Tax', value: -15 },
  { label: 'End', value: 90 },
];

export const marimekko = [
  { region: 'NA', Pro: 120, Plus: 80, Free: 40 },
  { region: 'EU', Pro: 90, Plus: 70, Free: 30 },
  { region: 'APAC', Pro: 60, Plus: 50, Free: 70 },
];
