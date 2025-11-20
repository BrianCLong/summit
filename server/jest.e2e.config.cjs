/**
 * Jest Configuration for E2E Tests
 * Uses Testcontainers for ephemeral databases
 */

module.exports = {
  displayName: 'e2e',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests/e2e'],
  testMatch: ['**/*.test.ts', '**/*.test.js'],
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: {
          module: 'ESNext',
          moduleResolution: 'node',
          esModuleInterop: true,
          allowSyntheticDefaultImports: true,
        },
      },
    ],
  },
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  // Global setup and teardown for test containers
  globalSetup: '<rootDir>/tests/e2e/setup.ts',
  globalTeardown: '<rootDir>/tests/e2e/setup.ts',
  // Increase timeout for container startup
  testTimeout: 120000,
  // Run tests serially to avoid port conflicts
  maxWorkers: 1,
  // Collect coverage from src directory
  collectCoverageFrom: [
    'src/**/*.{ts,js}',
    '!src/**/*.test.{ts,js}',
    '!src/**/__tests__/**',
    '!src/**/node_modules/**',
  ],
  coverageDirectory: 'coverage/e2e',
  coverageReporters: ['text', 'lcov', 'html'],
  // Setup files
  setupFilesAfterEnv: ['<rootDir>/tests/e2e/jest.setup.ts'],
  // Verbose output
  verbose: true,
};
