import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// Production-optimized Vite configuration
export default defineConfig({
  plugins: [react()],
  base: '/maestro/',
  build: {
    target: 'es2018',
    outDir: 'dist',
    assetsDir: 'assets',
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks - group stable dependencies
          'vendor-react': ['react', 'react-dom'],
          'vendor-router': ['react-router-dom'],
          'vendor-mui': ['@mui/material', '@mui/icons-material'],
          'vendor-recharts': ['recharts'],

          // App chunks - group by functionality
          'maestro-core': [
            './src/maestro/App.tsx',
            './src/maestro/auth/auth-context.tsx',
            './src/maestro/auth/auth-service.ts',
            './src/maestro/config.ts',
          ],
          'maestro-components': [
            './src/maestro/components/ControlHub.tsx',
            './src/maestro/components/RunsList.tsx',
            './src/maestro/components/UserProfile.tsx',
          ],
          'maestro-enhanced': [
            './src/maestro/components/EnhancedRunDetail.tsx',
            './src/maestro/components/EnhancedRoutingStudio.tsx',
            './src/maestro/components/EnhancedObservability.tsx',
          ],
          'maestro-pages': [
            './src/maestro/pages/RunDetail.tsx',
            './src/maestro/pages/PipelineDetail.tsx',
            './src/maestro/pages/Secrets.tsx',
          ],
        },
        // Asset naming for caching
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name!.split('.');
          const ext = info[info.length - 1];

          // Font files
          if (/\.(woff|woff2|ttf|eot)(\?.*)?$/.test(assetInfo.name!)) {
            return 'assets/fonts/[name].[hash].[ext]';
          }

          // Image files
          if (/\.(png|jpe?g|gif|svg|ico|webp)(\?.*)?$/.test(assetInfo.name!)) {
            return 'assets/images/[name].[hash].[ext]';
          }

          // CSS files
          if (ext === 'css') {
            return 'assets/css/[name].[hash].[ext]';
          }

          return 'assets/[name].[hash].[ext]';
        },
        chunkFileNames: 'assets/js/[name].[hash].js',
        entryFileNames: 'assets/js/[name].[hash].js',
      },
    },

    // Source maps for production debugging
    sourcemap: true,

    // Minification options
    minify: 'esbuild',

    // Chunk size warnings
    chunkSizeWarningLimit: 1000,

    // Asset inlining threshold
    assetsInlineLimit: 4096,

    // CSS code splitting
    cssCodeSplit: true,
  },

  // Optimization options
  esbuild: {
    drop: ['console', 'debugger'],
    legalComments: 'none',
  },

  // Asset resolution
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@maestro': resolve(__dirname, './src/maestro'),
    },
  },

  // Production server config for preview
  preview: {
    port: 4173,
    strictPort: true,
    host: true,
  },

  // Define global constants
  define: {
    __BUILD_VERSION__: JSON.stringify(
      process.env.VITE_BUILD_VERSION || '1.0.0',
    ),
    __BUILD_TIMESTAMP__: JSON.stringify(new Date().toISOString()),
  },
});
