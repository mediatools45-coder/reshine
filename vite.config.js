import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import path from 'node:path';

/* LEVEL=<id> builds a standalone page for one level (see scripts/build-split.mjs): the level registry is
   swapped for a module holding only that level, so the other nine are not bundled */
const LEVEL = process.env.LEVEL;
const oneLevel = LEVEL && {
  name: 'one-level', enforce: 'pre',
  resolveId(src, imp) { if (src === './levels/index.js' && imp && imp.endsWith('main.js')) return '\0one-level'; },
  load(id) { if (id === '\0one-level') return `import L from ${JSON.stringify(path.resolve('src/levels', LEVEL + '.js'))}; export const LEVELS = [L]; export const UPCOMING = [];`; }
};

export default defineConfig({
  plugins: [viteSingleFile(), oneLevel].filter(Boolean),
  define: { __SPLIT__: JSON.stringify(!!LEVEL) },
  build: { target: 'es2020', assetsInlineLimit: 100000000, chunkSizeWarningLimit: 5000, cssCodeSplit: false, outDir: LEVEL ? `dist-split/.tmp-${LEVEL}` : 'dist', emptyOutDir: true }
});
