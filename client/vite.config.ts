import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@app': path.resolve(__dirname, '../src'),
      '@ui': path.resolve(__dirname, './src'),
    },
  },
});
