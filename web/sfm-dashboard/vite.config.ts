import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    proxy: {
      '/events': 'http://localhost:8085',
      '/metrics': 'http://localhost:8085',
      '/alerts': 'http://localhost:8085',
      '/snapshots': 'http://localhost:8085',
      '/replay': 'http://localhost:8085'
    }
  }
});
