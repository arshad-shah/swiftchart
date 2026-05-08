/**
 * Regression: addTheme() must reach charts created via the React entry.
 *
 * tsup compiles `src/index.ts` and `src/react/index.tsx` as independent units
 * (`splitting: false`), so each output bundle inlines its own copy of
 * `core/themes.ts`. Before the fix, that meant two separate THEMES maps:
 * `addTheme()` from the core entry mutated one, the React components looked
 * up names in the other and silently fell back to `midnight`.
 *
 * The fix anchors the registry on `globalThis` so both inlined copies share
 * one map at runtime. This test loads both built bundles and asserts that a
 * theme registered on one is visible to the other.
 *
 * Runs against the dist artifacts (so it actually catches the bundler-level
 * bug, which the source tree alone cannot reproduce). Skips with a clear
 * message if dist hasn't been built — run `pnpm build` first.
 */
import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = resolve(__dirname, '..', '..');
const CORE_BUNDLE = resolve(ROOT, 'dist/esm/index.js');
const REACT_BUNDLE = resolve(ROOT, 'dist/esm/react/index.js');

const distBuilt = existsSync(CORE_BUNDLE) && existsSync(REACT_BUNDLE);

describe.skipIf(!distBuilt)('Regression: addTheme crosses the core/react bundle boundary', () => {
  it('a theme registered via the core entry is resolvable via the /react entry', async () => {
    const core = await import(pathToFileURL(CORE_BUNDLE).href);
    const react = await import(pathToFileURL(REACT_BUNDLE).href);

    expect(typeof core.addTheme).toBe('function');
    expect(typeof react.resolveTheme).toBe('function');

    const name = `__regression_${Date.now()}__`;
    const custom = {
      bg: '#abcdef', surface: '#fafafa', grid: '#eee',
      text: '#111', textMuted: '#666', axis: '#999',
      positive: '#0a0', negative: '#a00', onAccent: '#fff',
      colors: ['#123456'],
    };

    core.addTheme(name, custom);

    const resolved = react.resolveTheme(name);
    expect(resolved.bg).toBe(custom.bg);
    expect(resolved.colors[0]).toBe('#123456');
  });

  it('and the inverse: registering through /react is visible to the core entry', async () => {
    const core = await import(pathToFileURL(CORE_BUNDLE).href);
    const react = await import(pathToFileURL(REACT_BUNDLE).href);

    expect(typeof react.addTheme).toBe('function');

    const name = `__regression_react_${Date.now()}__`;
    react.addTheme(name, {
      bg: '#010203', surface: '#fff', grid: '#eee',
      text: '#000', textMuted: '#666', axis: '#999',
      positive: '#0a0', negative: '#a00', onAccent: '#fff',
      colors: ['#fedcba'],
    });

    expect(core.resolveTheme(name).bg).toBe('#010203');
  });
});

describe.skipIf(distBuilt)('Regression: addTheme cross-bundle test (dist missing)', () => {
  it.skip('build dist first (pnpm build) to enable cross-bundle theme regression test', () => {});
});
