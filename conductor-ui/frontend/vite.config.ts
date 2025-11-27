import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    hmr: {
      overlay: false, // Disable HMR overlay to potentially bypass CSP issues
    },
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
      '/maestro': {
        target: 'http://localhost:4000', // Redirect maestro assets if served by backend, but usually it's API only
        changeOrigin: true,
      }
    }
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks
          'vendor-react': ['react', 'react-dom'],
          'vendor-router': ['react-router-dom'],
          'vendor-mui': ['@mui/material', '@mui/icons-material'],
          'vendor-recharts': ['recharts'],

          // App chunks
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
      },
    },
    // Set chunk size warning limit higher since we're splitting chunks
    chunkSizeWarningLimit: 800,
  },
});
