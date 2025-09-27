import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// Maestro-only build: only includes maestro.html entry (renders MaestroApp)
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: resolve(__dirname, 'maestro.html'),
    },
  },
});
