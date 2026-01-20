import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/setupTests.jsx'],
    include: ['src/**/*.{test,spec}.{js,jsx,ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary', 'lcov'],
      include: ['src/**/*.{js,jsx,ts,tsx}'],
      exclude: ['src/**/*.d.ts', 'src/**/index.ts', 'src/main.tsx'],
    },
    alias: {
      // Mock assets (approximate regex support via direct mapping or function, Vitest alias is simple string or regex replacement)
      // For extensions, we might need a custom resolver or simplified mapping if keys are exact
      // Vitest alias doesn't support regex keys the same way Jest does for file extensions easily without a plugin or complex regex
      // But we can try to rely on Vite's asset handling or just mock specific files if they are imported.
      // Usually Vite handles assets fine (returning strings).

      // Mocks
      'dompurify': path.resolve(__dirname, '__mocks__/dompurify.js'),
      'ansi-regex': path.resolve(__dirname, '__mocks__/ansi-regex.js'),
    },
    css: {
        modules: {
            classNameStrategy: 'non-scoped',
        }
    }
  },
  resolve: {
    alias: {
        // React aliases to ensure singleton
        'react': path.resolve(__dirname, '../node_modules/react'),
        'react-dom': path.resolve(__dirname, '../node_modules/react-dom'),
        'react-redux': path.resolve(__dirname, '../node_modules/react-redux'),
    }
  }
});
