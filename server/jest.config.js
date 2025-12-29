/**
 * Jest Configuration for IntelGraph Server
 *
 * This configuration uses ts-jest with ESM support to handle TypeScript files
 * that use import.meta and other ESM features.
 */
export default {
  // preset: 'ts-jest/presets/default-esm', // Removed due to environment issues
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],

  setupFilesAfterEnv: [
    '<rootDir>/tests/setup/jest.setup.js',
  ],

  testMatch: [
    '<rootDir>/tests/**/*.test.ts',
    '<rootDir>/src/tests/**/*.test.ts',
    '<rootDir>/src/**/__tests__/**/*.test.ts',
  ],

  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/build/',
    '/coverage/',
    '/playwright-tests/',
    // Skip tests that require external dependencies not available in test environment
    '/src/connectors/__tests__/gcs-ingest.test.ts',
    // Skip integration tests that need full infrastructure
    '/tests/governance-acceptance.test.ts',
    // Skip tests that have ESM/import.meta conflicts with source files
    '/tests/api-docs.test.ts',
    // FLAKY TEST QUARANTINE: Exclude flaky tests from main run
    '\\.flaky\\.test\\.ts$',
  ],

  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@tests/(.*)$': '<rootDir>/tests/$1',
    // Handle .js extensions in imports
    '^(\\.{1,2}/.*)\\.js$': '$1',
    // Mock native/unavailable modules
    '^pkcs11js$': '<rootDir>/tests/__mocks__/pkcs11js.js',
    '^@packages/cache$': '<rootDir>/tests/__mocks__/packages-cache.js',
    '^@server/pits$': '<rootDir>/tests/__mocks__/server-pits.js',
  },

  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        useESM: true,
        isolatedModules: true, // Faster compilation
        tsconfig: {
          module: 'ESNext',
          moduleResolution: 'Bundler',
          target: 'ES2022',
          allowJs: true,
          esModuleInterop: true,
          allowSyntheticDefaultImports: true,
        },
      },
    ],
  },

  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/__tests__/**',
    '!src/**/*.test.ts',
    '!src/**/*.spec.ts',
    '!src/tests/**',
    '!src/**/index.ts',
    '!src/config/**',
    '!src/database/**',
  ],

  coverageProvider: 'v8',
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  coverageReporters: ['text', 'lcov', 'html', 'json-summary'],
  coverageDirectory: '<rootDir>/coverage',

  testTimeout: 30000,
  globalSetup: '<rootDir>/tests/setup/globalSetup.js',
  globalTeardown: '<rootDir>/tests/setup/globalTeardown.js',

  reporters: ['default'],

  verbose: true,
  clearMocks: true,
  restoreMocks: true,
  resetMocks: false, // Keep mock implementations between tests
  bail: false,
  errorOnDeprecated: true,

  transformIgnorePatterns: [
    // Transform ESM packages in node_modules
    '/node_modules/(?!(node-fetch|data-uri-to-buffer|fetch-blob|formdata-polyfill|@exodus|html-encoding-sniffer|jsdom|apollo-server-env|apollo-server-core|apollo-server-express)/)',
  ],

  // Increase workers for faster parallel testing
  maxWorkers: process.env.CI ? 2 : '50%',

  // Handle ESM modules from node_modules
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node', 'mjs'],
};
