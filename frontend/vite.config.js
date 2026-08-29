import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  base: '/beanleague/',
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    host: '0.0.0.0',
    proxy: {
      '/beanleague/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/beanleague/, ''),
      },
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },
});
