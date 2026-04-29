import { defineConfig } from 'tsup';
import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';

const shared = {
  splitting: false,
  treeshake: true,
  minify: true,
  sourcemap: true,
  target: 'es2020',
  external: ['react', 'react-dom'],
} as const;

async function prependUseClient(file: string) {
  if (!existsSync(file)) return;
  const src = await readFile(file, 'utf8');
  if (src.startsWith('"use client"') || src.startsWith("'use client'")) return;
  await writeFile(file, `"use client";\n${src}`, 'utf8');
}

export default defineConfig([
  // Core — ESM + DTS
  {
    ...shared,
    entry: { index: 'src/index.ts' },
    format: ['esm'],
    outDir: 'dist/esm',
    clean: true,
    dts: true,
  },
  // Core — CJS
  {
    ...shared,
    entry: { index: 'src/index.ts' },
    format: ['cjs'],
    outDir: 'dist/cjs',
    dts: true,
  },
  // React — ESM + DTS
  {
    ...shared,
    entry: { index: 'src/react/index.tsx' },
    format: ['esm'],
    outDir: 'dist/esm/react',
    dts: true,
    onSuccess: async () => { await prependUseClient('dist/esm/react/index.js'); },
  },
  // React — CJS
  {
    ...shared,
    entry: { index: 'src/react/index.tsx' },
    format: ['cjs'],
    outDir: 'dist/cjs/react',
    dts: true,
    onSuccess: async () => { await prependUseClient('dist/cjs/react/index.cjs'); },
  },
]);
