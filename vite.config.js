import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        assetFileNames: 'assets/[name]-[hash]-worldcup[extname]',
        chunkFileNames: 'assets/[name]-[hash]-worldcup.js',
        entryFileNames: 'assets/[name]-[hash]-worldcup.js',
      },
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'https://world-cup-monitor-eight.vercel.app',
        changeOrigin: true,
      },
    },
  },
});
