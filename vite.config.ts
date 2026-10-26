import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

// The portal is the site's front door: / is the portal, /play/ the game
// (BalatroFrontEnd), /api/ the game API, /identity/ the identity service. In
// development this server passes them to their own dev servers, so that the
// game and the portal share one origin (and the player's session).
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: {
    port: 5174,
    strictPort: true,
    proxy: {
      // the game's dev server (npm run dev in ../BalatroFrontEnd): /play and /play/... only (not /players)
      '^/play(/|$)': { target: process.env.BALATRO_GAME ?? 'http://localhost:5173', ws: true },
      // the API (uv run balatro-api)
      '/api': process.env.BALATRO_API ?? 'http://127.0.0.1:8000',
      // the bug report service (make run in ../BalatroBugReportService)
      '/reports': {
        target: process.env.BALATRO_REPORTS ?? 'http://127.0.0.1:8003',
        rewrite: (path) => path.replace(/^\/reports/, ''),
        headers: { 'X-Forwarded-Prefix': '/reports' },
      },
      // the identity service (make run)
      '/identity': {
        target: process.env.BALATRO_IDENTITY ?? 'http://127.0.0.1:8001',
        rewrite: (path) => path.replace(/^\/identity/, ''),
      },
    },
  },
  build: { target: 'es2022' },
});
