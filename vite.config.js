import { defineConfig } from 'vite';

export default defineConfig({
  base: '/WeniaSalao/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
  },
  server: {
    host: true, // Allows access from mobile on same network
    port: 5173,
  },
});
