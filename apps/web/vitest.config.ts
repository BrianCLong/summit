import { defineConfig, mergeConfig } from 'vitest/config'
import path from 'path'
import viteConfig from './vite.config'

export default mergeConfig(
  viteConfig,
  defineConfig({
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: ['./vitest.setup.ts', './src/setupTests.ts'],
      coverage: {
        provider: 'v8',
        reporter: ['json-summary'],
      },
      include: ['src/**/*.{test,spec}.{ts,tsx,js,jsx}'],
      exclude: [
        '**/node_modules/**',
        '**/dist/**',
        '**/e2e/**',
        'tests/e2e/**',
        'tests/**',
      ],
    },
  })
)
