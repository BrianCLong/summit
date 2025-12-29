/**
 * Jest Configuration for IntelGraph Server
 */
export default {
  preset: 'ts-jest/presets/default-esm', // Use ESM preset
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  setupFilesAfterEnv: [
    '<rootDir>/tests/setup/jest.setup.js',
    'jest-extended/all',
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
    '/src/connectors/__tests__/gcs-ingest.test.ts', // Missing @intelgraph/connector-sdk dependency
    // Tests that import modules using import.meta.url (not supported in Jest CommonJS mode)
    '/src/maestro/__tests__/integration.test.ts',
    '/src/routes/__tests__/airgap.test.ts',
    '/src/routes/__tests__/policy-simulation.test.ts',
    '/src/security/__tests__/replay-harness.test.ts',
    '/src/webhooks/__tests__/webhook.test.ts',
    '/src/tests/services/PolicyEngine.test.ts',
    // Acceptance/integration tests that require full app and infrastructure
    '/tests/governance-acceptance.test.ts',
    // Tests with complex mocking requirements that need refactoring
    '/src/hunting/__tests__/ThreatHuntingOrchestrator.test.ts',
    '/src/repos/__tests__/RelationshipRepo.test.ts',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@tests/(.*)$': '<rootDir>/tests/$1',
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: {
          module: 'esnext',
          target: 'es2020',
          allowJs: true // Allow JS files to be processed if needed
        },
      },
    ],
    // Transform JS files as well using ts-jest or babel-jest if needed
    '^.+\\.js$': 'babel-jest',
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
  testResultsProcessor: 'jest-junit',
  reporters: [
    'default',
    [
      'jest-junit',
      {
        outputDirectory: '<rootDir>/test-results',
        outputName: 'junit.xml',
        classNameTemplate: '{classname}',
        titleTemplate: '{title}',
        ancestorSeparator: ' › ',
        usePathForSuiteName: true,
      },
    ],
  ],
  verbose: true,
  clearMocks: true,
  restoreMocks: true,
  resetMocks: true,
  bail: false,
  errorOnDeprecated: true,
  transformIgnorePatterns: [
    // Allow ESM packages to be transformed - handles both npm and pnpm structures
    '/node_modules/(?!.pnpm)(?!(' +
      'node-fetch|' +
      'data-uri-to-buffer|' +
      'fetch-blob|' +
      'formdata-polyfill|' +
      '@exodus|' +
      'html-encoding-sniffer|' +
      '.*\\.mjs$' +
    '))',
    // For pnpm, we need to match differently
    '/node_modules/.pnpm/(?!(' +
      'node-fetch|' +
      'data-uri-to-buffer|' +
      'fetch-blob|' +
      'formdata-polyfill|' +
      'apollo-server|' +
      '@exodus|' +
      'html-encoding-sniffer' +
    '))',
  ],
  maxWorkers: process.env.CI ? 2 : '50%',
};
