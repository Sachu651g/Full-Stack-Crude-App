// vite.config.js — Vite build configuration for the React frontend
// Proxies /api requests to the Express backend during development so the
// browser doesn't hit CORS issues when running both servers locally.

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    // Proxy API calls to the Express backend (default port 5000)
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
});
