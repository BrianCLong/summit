import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import babel from 'vite-plugin-babel'; // Added import
import path from 'path'

export default defineConfig({
  plugins: [
    react(),
    babel({
      filter: /react-speech-recognition/, // Only apply to this module
      babelConfig: {
        presets: [
          ['@babel/preset-env', { targets: { node: 'current' } }],
          ['@babel/preset-react', { runtime: 'automatic' }],
        ],
        plugins: [
          '@babel/plugin-transform-runtime',
        ],
      },
    }),
  ],
  resolve: {
    alias: [
      { find: '@', replacement: path.resolve(__dirname, './src') },
      // Map the generated JS module specifier to the TS source during dev/build
      { find: /\/generated\/graphql\.js$/, replacement: path.resolve(__dirname, 'src/generated/graphql.ts') },
      // Map store entry for NodeNext-style .js imports to TS source in dev
      { find: /\/store\/index\.js$/, replacement: path.resolve(__dirname, 'src/store/index.ts') },
      { find: /^@\/store\/index$/, replacement: path.resolve(__dirname, 'src/store/index.ts') },
      { find: /\/layout\/AppHeader\.js$/, replacement: path.resolve(__dirname, 'src/layout/AppHeader.tsx') },
      { find: /\/apollo\/index\.js$/, replacement: path.resolve(__dirname, 'src/apollo/index.tsx') },
      { find: /\/pages\/Dashboard\/index\.js$/, replacement: path.resolve(__dirname, 'src/pages/Dashboard/index.tsx') },
      { find: /\/pages\/GraphWorkbench\/index\.js$/, replacement: path.resolve(__dirname, 'src/pages/GraphWorkbench/index.tsx') },
      { find: /\/pages\/Investigations\/InvestigationList\.js$/, replacement: path.resolve(__dirname, 'src/pages/Investigations/InvestigationList.tsx') },
      { find: /\/pages\/Investigations\/InvestigationDetail\.js$/, replacement: path.resolve(__dirname, 'src/pages/Investigations/InvestigationDetail.tsx') },
      { find: /\/pages\/Hunting\/HuntList\.js$/, replacement: path.resolve(__dirname, 'src/pages/Hunting/HuntList.tsx') },
      { find: /\/pages\/Hunting\/HuntRun\.js$/, replacement: path.resolve(__dirname, 'src/pages/Hunting/HuntRun.tsx') },
      { find: /\/pages\/IOC\/IOCList\.js$/, replacement: path.resolve(__dirname, 'src/pages/IOC/IOCList.tsx') },
      { find: /\/pages\/IOC\/IOCDetail\.js$/, replacement: path.resolve(__dirname, 'src/pages/IOC/IOCDetail.tsx') },
      { find: /\/pages\/Search\/SearchHome\.js$/, replacement: path.resolve(__dirname, 'src/pages/Search/SearchHome.tsx') },
    ],
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
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/tests/setup.js',
    exclude: ['**/*.spec.ts', 'tests/e2e/**', '**/node_modules/**'],
  },
})
