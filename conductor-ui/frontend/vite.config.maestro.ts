import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// Maestro-only build: only includes maestro.html entry (renders MaestroApp)
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist-new',
    rollupOptions: {
      input: resolve(__dirname, 'maestro.html'),
      output: {
        entryFileNames: 'app-[hash].js',
        chunkFileNames: 'app-[hash].js',
        assetFileNames: 'app-[hash].[ext]',
      },
    },
  },
});
