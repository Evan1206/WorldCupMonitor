import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: 'https://world-cup-monitor-eight.vercel.app',
        changeOrigin: true,
      },
    },
  },
});
