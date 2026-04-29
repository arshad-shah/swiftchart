/**
 * SwiftChart brand mark.
 *
 * Distinct from existing chart-library logos:
 *   - Chart.js: red doughnut         → ours: cyan→violet square
 *   - Recharts: bullseye            → ours: ascending bars
 *   - Highcharts: skewed bars       → ours: rounded uniform bars
 *   - ECharts: stylised flame       → ours: bar+spark composition
 *   - Victory / Nivo / Plotly / ApexCharts: nothing similar
 *
 * The "swift" idea is conveyed by the amber accent line tracing the trend
 * across the bar tops — a single fluid stroke that suggests motion.
 */

export function BrandMark({ size = 32 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="SwiftChart"
    >
      <defs>
        <linearGradient id="sc-brand-bg" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#0ea5e9" />
          <stop offset="0.55" stopColor="#6366f1" />
          <stop offset="1" stopColor="#a855f7" />
        </linearGradient>
        <linearGradient id="sc-brand-spark" x1="0" y1="20" x2="32" y2="6" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#fde68a" />
          <stop offset="1" stopColor="#fb923c" />
        </linearGradient>
      </defs>

      {/* rounded tile */}
      <rect width="32" height="32" rx="8" fill="url(#sc-brand-bg)" />
      {/* subtle inner highlight */}
      <rect x="0.5" y="0.5" width="31" height="31" rx="7.5" fill="none" stroke="#ffffff22" />

      {/* ascending bars (semi-transparent white so accent reads on top) */}
      <rect x="6"  y="19" width="4" height="7"  rx="1.5" fill="#ffffff" fillOpacity="0.45" />
      <rect x="12" y="14" width="4" height="12" rx="1.5" fill="#ffffff" fillOpacity="0.65" />
      <rect x="18" y="10" width="4" height="16" rx="1.5" fill="#ffffff" fillOpacity="0.85" />
      <rect x="24" y="6"  width="4" height="20" rx="1.5" fill="#ffffff" />

      {/* swift accent — gradient stroke tracing the bar tops */}
      <path
        d="M8 19 L14 14 L20 10 L26 6"
        stroke="url(#sc-brand-spark)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* head dot */}
      <circle cx="26" cy="6" r="1.6" fill="#fde68a" />
    </svg>
  );
}

/** Same mark on a transparent background — for embedding inside a header. */
export function BrandMarkBare({ size = 32 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <rect x="6"  y="19" width="4" height="7"  rx="1.5" fill="currentColor" fillOpacity="0.40" />
      <rect x="12" y="14" width="4" height="12" rx="1.5" fill="currentColor" fillOpacity="0.55" />
      <rect x="18" y="10" width="4" height="16" rx="1.5" fill="currentColor" fillOpacity="0.75" />
      <rect x="24" y="6"  width="4" height="20" rx="1.5" fill="currentColor" />
      <path
        d="M8 19 L14 14 L20 10 L26 6"
        stroke="#fb923c"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
