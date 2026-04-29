/** Synthetic datasets used across the playground demos. */

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
    for (let i = 0; i < 60; i++) {
      const ang = Math.random() * Math.PI * 2;
      const r = Math.pow(Math.random(), 2) * 18;
      out.push({
        x: cx + Math.cos(ang) * r,
        y: cy + Math.sin(ang) * r,
        group: g,
        size: 4 + Math.random() * 6,
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

export function bigSeries(n: number) {
  const out: { x: number; v: number }[] = [];
  for (let i = 0; i < n; i++) {
    out.push({
      x: i,
      v: Math.sin(i / 60) * 50 + Math.cos(i / 13) * 18 + Math.random() * 6 + 100,
    });
  }
  return out;
}

/** Intentionally hostile labels to demonstrate the XSS hardening. */
export const xssData = [
  { label: '<script>alert(1)</script>', value: 30 },
  { label: '"><img src=x onerror=alert(2)>', value: 45 },
  { label: 'javascript:alert(3)', value: 25 },
];
