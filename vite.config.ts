import { defineConfig } from 'vite';

export default defineConfig(({ mode }) => {
  const isProd = mode === 'production';

  return {
    base: './',
    build: {
      outDir: 'app/src/main/assets/web',
      emptyOutDir: true,
      target: 'es2020',
      minify: 'esbuild',
      sourcemap: false,
      chunkSizeWarningLimit: 3500,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('@babylonjs/core')) {
              return 'vendor-babylon';
            }
            if (id.includes('@capacitor')) {
              return 'vendor-capacitor';
            }
          }
        }
      }
    },
    esbuild: {
      drop: isProd ? ['console', 'debugger'] : []
    },
    server: {
      port: 3000,
      host: true
    }
  };
});
