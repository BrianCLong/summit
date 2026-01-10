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
    '<rootDir>/jest.setup.js',
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
    // Suites that still require hardened environments
    '/tests/security/',
    '/tests/services/security/',
    '/tests/network-security',
    '/src/security/tenant-simulation/__tests__/',
    // GraphQL end-to-end suites
    '/tests/graphql/',
    '/tests/graphqlPersisted',
    '/tests/graphql.test.ts',
    '/tests/apollo',
    '/src/graphql/__tests__/',
    '/src/graphql/dataloaders/__tests__/',
    '/src/graphql/resolvers/__tests__/',
    // Billing and metering suites
    '/src/billing/entitlements/__tests__/',
    '/src/services/billing/__tests__/',
    '/src/metering/__tests__/',
    // Webhook flows with external callbacks
    '/src/webhooks/__tests__/',
    '/src/tests/payments_webhook',
    '/src/tests/ai.webhook',
    // Worker/queue orchestration suites
    '/src/workers/__tests__/',
    '/src/queue/__tests__/',
    '/tests/queue',
    '/src/maestro/runs/__tests__/',
    '/src/jobs/__tests__/',
    '/src/maestro/__tests__/',
  ],

  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@tests/(.*)$': '<rootDir>/tests/$1',
    // Handle .js extensions in imports
    '^(\\.{1,2}/.*)\\.js$': '$1',
    // Mock ESM-only modules
    '^node-fetch$': '<rootDir>/../__mocks__/node-fetch.js',
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
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85,
    },
    './src/graphql/': { branches: 70, functions: 70, lines: 70, statements: 70 },
    './src/security/': { branches: 70, functions: 70, lines: 70, statements: 70 },
    './src/services/billing/': { branches: 70, functions: 70, lines: 70, statements: 70 },
    './src/webhooks/': { branches: 70, functions: 70, lines: 70, statements: 70 },
    './src/workers/': { branches: 70, functions: 70, lines: 70, statements: 70 },
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
    '/node_modules/(?!(node-fetch|data-uri-to-buffer|fetch-blob|formdata-polyfill|@exodus|html-encoding-sniffer|jsdom|apollo-server-env|apollo-server-core|apollo-server-express|@opentelemetry)/)',
  ],

  // Increase workers for faster parallel testing
  maxWorkers: process.env.CI ? 2 : '50%',

  // Handle ESM modules from node_modules
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node', 'mjs'],
};
