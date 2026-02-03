import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { visualizer } from 'rollup-plugin-visualizer'

// https://vitejs.dev/config/
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
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.ts',
    exclude: ['tests/**', 'node_modules/**'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    // Ensure proper module resolution for packages with complex exports
    conditions: ['browser', 'module', 'import'],
  },
  server: {
    port: 3000,
    host: true,
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
          // Apollo GraphQL & data fetching
          'data-vendor': [
            '@apollo/client',
            'graphql',
            'graphql-ws',
            '@tanstack/react-query',
          ],
          // UI component libraries
          'ui-vendor': [
            '@headlessui/react',
            '@heroicons/react',
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-select',
            '@radix-ui/react-tabs',
            '@radix-ui/react-toast',
            '@radix-ui/react-tooltip',
            'lucide-react',
          ],
          // State & form management
          'state-vendor': [
            'zustand',
            'react-hook-form',
            '@hookform/resolvers',
            'zod',
          ],
          // Visualization libraries (D3 modules, Recharts)
          // Using individual D3 modules for tree-shaking (~55KB vs ~300KB)
          'viz-vendor': [
            'd3-selection',
            'd3-force',
            'd3-zoom',
            'd3-drag',
            'recharts',
          ],
          // Animation
          'animation-vendor': ['framer-motion'],
          // Utilities
          'utils-vendor': ['lodash', 'clsx', 'tailwind-merge'],
        },
      },
    },
    // Performance budgets - warn if chunks exceed these sizes
    chunkSizeWarningLimit: 800, // 800KB warning
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
      'zustand',
      // D3 modules for graph visualization
      'd3-selection',
      'd3-force',
      // Include Apollo Client to fix module resolution
      '@apollo/client',
    ],
    exclude: [
      // Exclude heavy deps from pre-bundling (lazy loaded)
      'framer-motion',
    ],
  },
})
