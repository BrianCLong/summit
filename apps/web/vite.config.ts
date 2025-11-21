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
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
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
          // Visualization libraries (D3, Recharts)
          'viz-vendor': ['d3', 'recharts'],
          // Animation
          'animation-vendor': ['framer-motion'],
          // Utilities
          'utils-vendor': ['lodash', 'clsx', 'tailwind-merge', 'immer'],
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
      '@apollo/client',
      'zustand',
    ],
    exclude: [
      // Exclude heavy deps from pre-bundling
      'd3',
      'framer-motion',
    ],
  },
})
