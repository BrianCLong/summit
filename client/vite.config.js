import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig({
  plugins: [
    react({
      // Ensure JSX is handled even in .js files
      include: "**/*.{jsx,tsx,js,ts}",
      babel: {
        parserOpts: {
          plugins: ['decorators-legacy', 'classProperties']
        }
      }
    }),
    visualizer({
      filename: './dist/stats.html',
      open: false,
      gzipSize: true,
      brotliSize: true,
    }),
  ],
  esbuild: {
    loader: 'jsx',
    include: /src\/.*\.js$/, // Apply to all .js files in src
    exclude: [],
  },
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
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'apollo-vendor': ['@apollo/client', 'graphql', 'graphql-ws'],
          'mui-vendor': [
            '@mui/material',
            '@mui/icons-material',
            '@mui/lab',
            '@mui/x-data-grid',
            '@emotion/react',
            '@emotion/styled',
          ],
          'state-vendor': ['@reduxjs/toolkit', 'react-redux'],
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
          'd3-vendor': ['d3', 'd3-force', 'd3-selection'],
          'map-vendor': ['leaflet', 'react-leaflet'],
          'timeline-vendor': ['vis-timeline'],
          'utils-vendor': ['lodash', 'date-fns', 'uuid', 'zod', 'fuse.js'],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
  },
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
      'cytoscape',
      'd3',
      'leaflet',
      'vis-timeline',
    ],
    esbuildOptions: {
        loader: {
            '.js': 'jsx',
        },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/tests/setup.js',
    exclude: ['**/*.spec.ts', 'tests/e2e/**', '**/node_modules/**'],
  },
});
