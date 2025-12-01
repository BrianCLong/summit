import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig({
  plugins: [
    react(),
    // Bundle analyzer - generates stats.html on build
    visualizer({
      filename: './dist/stats.html',
      open: false,
      gzipSize: true,
      brotliSize: true,
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    host: '0.0.0.0',
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
      '/graphql': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://localhost:4000',
        ws: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    // Performance: Split vendor code for better caching
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React libraries
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          // Apollo GraphQL
          'apollo-vendor': ['@apollo/client', 'graphql', 'graphql-ws'],
          // Material UI (heavy library)
          'mui-vendor': [
            '@mui/material',
            '@mui/icons-material',
            '@mui/lab',
            '@mui/x-data-grid',
            '@emotion/react',
            '@emotion/styled',
          ],
          // State management
          'state-vendor': ['@reduxjs/toolkit', 'react-redux'],
          // Graph visualization (Cytoscape - very heavy)
          'graph-vendor': [
            'cytoscape',
            'cytoscape-cola',
            'cytoscape-dagre',
            'cytoscape-fcose',
            'cytoscape-cose-bilkent',
            'cytoscape-popper',
            'cytoscape-qtip',
            'cytoscape-edgehandles',
            'cytoscape-context-menus',
            'cytoscape-grid-guide',
            'cytoscape-navigator',
            'cytoscape-panzoom',
          ],
          // Data visualization (D3 - heavy)
          'd3-vendor': ['d3', 'd3-force', 'd3-selection'],
          // Maps (Leaflet)
          'map-vendor': ['leaflet', 'react-leaflet'],
          // Timeline visualization
          'timeline-vendor': ['vis-timeline'],
          // Utilities
          'utils-vendor': ['lodash', 'date-fns', 'uuid', 'zod', 'fuse.js'],
        },
      },
    },
    // Performance budgets - warn if chunks exceed these sizes
    chunkSizeWarningLimit: 1000, // 1MB warning (default is 500KB)
    // Enable minification and tree shaking
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Remove console.log in production
        drop_debugger: true,
      },
    },
  },
  // Optimize dependency pre-bundling
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@apollo/client',
      '@mui/material',
      '@reduxjs/toolkit',
    ],
    exclude: [
      // Exclude heavy deps from pre-bundling - they'll be lazy loaded
      'cytoscape',
      'd3',
      'leaflet',
      'vis-timeline',
    ],
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/tests/setup.js',
    exclude: ['**/*.spec.ts', 'tests/e2e/**', '**/node_modules/**'],
  },
});
