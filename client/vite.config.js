import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    allowedHosts: ['hart-introduce-tommy-berlin.trycloudflare.com', 'during-sports-drink-fair.trycloudflare.com', 'thumb-fails-dos-titles.trycloudflare.com', 'lot-pic-itunes-physicians.trycloudflare.com', '4bhj8g2b-5173.inc1.devtunnels.ms'],

    proxy: {
      '/api': 'http://localhost:4000',
      '/uploads': 'http://localhost:4000'
    }
  }
});
