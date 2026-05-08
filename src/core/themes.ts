import type { Theme, ThemeName } from '../types';

const BUILTINS: Record<string, Theme> = {
  midnight: {
    bg: '#12161c', surface: '#1a1f28', grid: '#252b3640',
    text: '#e2e8f0', textMuted: '#7a8599', axis: '#3a4255',
    positive: '#34d399', negative: '#ef4444',
    onAccent: '#ffffff',
    colors: ['#38bdf8','#a78bfa','#34d399','#fb923c','#f472b6','#facc15','#ef4444','#2dd4bf','#818cf8','#e879f9'],
  },
  arctic: {
    bg: '#ffffff', surface: '#f8fafc', grid: '#cbd5e160',
    text: '#1e293b', textMuted: '#64748b', axis: '#cbd5e1',
    positive: '#059669', negative: '#dc2626',
    onAccent: '#ffffff',
    colors: ['#0ea5e9','#8b5cf6','#10b981','#f59e0b','#ec4899','#eab308','#ef4444','#14b8a6','#6366f1','#d946ef'],
  },
  ember: {
    bg: '#1a0a0a', surface: '#241010', grid: '#3d1a1a40',
    text: '#fde8e8', textMuted: '#b07070', axis: '#5a2020',
    positive: '#34d399', negative: '#ef4444',
    onAccent: '#ffffff',
    colors: ['#ef4444','#fb923c','#facc15','#f472b6','#a78bfa','#38bdf8','#34d399','#e879f9','#2dd4bf','#818cf8'],
  },
  forest: {
    bg: '#0a1a0f', surface: '#102418', grid: '#1a3d2440',
    text: '#e8fde8', textMuted: '#70b080', axis: '#205a30',
    positive: '#34d399', negative: '#ef4444',
    onAccent: '#ffffff',
    colors: ['#34d399','#a3e635','#38bdf8','#facc15','#fb923c','#a78bfa','#f472b6','#2dd4bf','#818cf8','#ef4444'],
  },
};

// The registry is anchored on globalThis so that the core ESM bundle
// (./dist/esm/index.js) and the React ESM bundle (./dist/esm/react/index.js)
// — which tsup compiles as independent units with `splitting: false`,
// each inlining its own copy of this module — share one map at runtime.
// Without this, addTheme() called via the core entry was invisible to
// charts rendered through `/react`.
const REGISTRY_KEY = '__SWIFT_CHART_THEMES_V1__';
type GlobalWithRegistry = typeof globalThis & {
  [REGISTRY_KEY]?: Record<string, Theme>;
};
const g = globalThis as GlobalWithRegistry;
export const THEMES: Record<string, Theme> = g[REGISTRY_KEY] ??= { ...BUILTINS };

const SEMANTIC_DEFAULTS = {
  positive: '#34d399',
  negative: '#ef4444',
  onAccent: '#ffffff',
};

export function resolveTheme(theme?: ThemeName | Theme): Theme {
  if (!theme) return THEMES.midnight;
  if (typeof theme === 'string') return THEMES[theme] || THEMES.midnight;
  // Backfill semantic fields if a partial custom theme was passed.
  return { ...SEMANTIC_DEFAULTS, ...theme } as Theme;
}

export function addTheme(name: string, theme: Theme): void {
  THEMES[name] = { ...SEMANTIC_DEFAULTS, ...theme } as Theme;
}
