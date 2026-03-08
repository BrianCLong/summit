"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vite_1 = require("vite");
const plugin_react_1 = __importDefault(require("@vitejs/plugin-react"));
const path_1 = __importDefault(require("path"));
const rollup_plugin_visualizer_1 = require("rollup-plugin-visualizer");
// https://vitejs.dev/config/
exports.default = (0, vite_1.defineConfig)({
    plugins: [
        (0, plugin_react_1.default)(),
        // Bundle analyzer - generates stats.html on build
        (0, rollup_plugin_visualizer_1.visualizer)({
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
            '@': path_1.default.resolve(__dirname, './src'),
        },
        // Ensure proper module resolution for packages with complex exports
        conditions: ['browser', 'module', 'import'],
    },
    server: {
        proxy: {
            '/api/rag': {
                target: 'http://localhost:8001',
                changeOrigin: true,
                rewrite: (path) => path.replace(/^\/api\/rag/, '')
            },
            '/api/graphrag': {
                target: 'http://localhost:8002',
                changeOrigin: true,
                rewrite: (path) => path.replace(/^\/api\/graphrag/, '')
            }
        },
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
});
