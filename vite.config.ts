import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    outDir: 'app/src/main/assets/web',
    emptyOutDir: true,
    target: 'es2020',
    chunkSizeWarningLimit: 3000
  },
  server: {
    port: 3000,
    host: true
  }
});
