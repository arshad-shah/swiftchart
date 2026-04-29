import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

// Resolve `swiftchart` directly to source so editing src/ hot-reloads here.
const root = path.resolve(__dirname, '..');

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      'swiftchart/react': path.resolve(root, 'src/react/index.tsx'),
      'swiftchart': path.resolve(root, 'src/index.ts'),
    },
  },
  server: { port: 5173, open: true },
});
