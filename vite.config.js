import { defineConfig } from 'vite';

/**
 * Inlines the bundled script into index.html at build time, so dist/index.html
 * is a single file that can be double-clicked and played without a server.
 * (Browsers refuse to load ES module scripts over file://.)
 */
function singleFile() {
  return {
    name: 'gutter-cat-single-file',
    enforce: 'post',
    generateBundle(_options, bundle) {
      const html = Object.values(bundle).find((f) => f.fileName.endsWith('.html'));
      if (!html) return;
      let source = String(html.source);
      for (const [name, chunk] of Object.entries(bundle)) {
        if (chunk.type !== 'chunk') continue;
        const code = chunk.code.replace(/<\/script/gi, '<\\/script');
        const tag = new RegExp(`<script[^>]*src="[^"]*${chunk.fileName.split('/').pop()}"[^>]*></script>`);
        source = source.replace(tag, '');
        // Replacer function: "$" sequences in the bundle must stay literal.
        source = source.replace('</body>', () => `<script>${code}</script>\n</body>`);
        delete bundle[name];
      }
      html.source = source;
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [singleFile()],
  build: {
    target: 'es2020',
    assetsInlineLimit: 100000000,
    chunkSizeWarningLimit: 4000,
    rollupOptions: {
      output: { format: 'iife', inlineDynamicImports: true },
    },
  },
  server: { open: true },
});
