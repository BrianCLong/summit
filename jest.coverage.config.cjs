/**
 * Jest Coverage Configuration
 *
 * This configuration file is specifically designed for comprehensive
 * coverage testing across the entire IntelGraph platform.
 *
 * Coverage Thresholds:
 * - Global: 80% minimum coverage
 * - Critical paths: 90% minimum coverage
 *
 * Usage:
 *   npm run test:coverage
 *   jest --config jest.coverage.config.cjs
 */

module.exports = {
  preset: 'ts-jest/presets/default-esm',
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  globals: {
    'ts-jest': {
      useESM: true,
      tsconfig: {
        allowSyntheticDefaultImports: true,
        esModuleInterop: true,
      },
    },
  },
  testEnvironment: 'node',

  // Test Discovery
  roots: ['<rootDir>/server', '<rootDir>/client', '<rootDir>/packages', '<rootDir>/services'],
  testMatch: [
    '**/__tests__/**/*.{ts,tsx,js,jsx}',
    '**/?(*.)+(spec|test).{ts,tsx,js,jsx}',
  ],

  // Coverage Collection
  collectCoverage: true,
  collectCoverageFrom: [
    // Server coverage
    'server/src/**/*.{ts,tsx,js,jsx}',

    // Services coverage
    'services/*/src/**/*.{ts,tsx,js,jsx}',

    // Packages coverage
    'packages/*/src/**/*.{ts,tsx,js,jsx}',

    // Client coverage
    'client/src/**/*.{ts,tsx,js,jsx}',

    // Exclusions
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/dist/**',
    '!**/build/**',
    '!**/coverage/**',
    '!**/*.config.{js,ts,cjs,mjs}',
    '!**/tests/**',
    '!**/__tests__/**',
    '!**/__mocks__/**',
    '!**/e2e/**',
    '!**/archive/**',
    '!**/salvage/**',
    '!**/pull/**',
    '!**/.next/**',
    '!**/.turbo/**',
    '!**/generated/**',
  ],

  // Coverage Thresholds
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
    // Critical paths require higher coverage
    './server/src/middleware/**/*.ts': {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85,
    },
    './services/api/src/**/*.ts': {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85,
    },
    './server/src/graphql/resolvers/**/*.ts': {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85,
    },
  },

  // Coverage Reporters
  coverageReporters: [
    'text',
    'text-summary',
    'html',
    'lcov',
    'cobertura',
    'json-summary',
  ],

  coverageDirectory: '<rootDir>/coverage',

  // Path Ignore Patterns
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/build/',
    '/coverage/',
    '/archive/',
    '/salvage/',
    '/pull/',
    '/.next/',
    '/.turbo/',
  ],

  modulePathIgnorePatterns: [
    '<rootDir>/dist/',
    '<rootDir>/build/',
    '<rootDir>/archive/',
    '<rootDir>/salvage/',
    '<rootDir>/pull/',
  ],

  watchPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/build/',
    '/coverage/',
    '/archive/',
    '/salvage/',
    '/pull/',
  ],

  // Module Resolution
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/server/src/$1',
    '^@client/(.*)$': '<rootDir>/client/src/$1',
    '^@tests/(.*)$': '<rootDir>/tests/$1',
    '^@server/(.*)$': '<rootDir>/server/src/$1',
    '^@services/(.*)$': '<rootDir>/services/$1',
    '^(\\.{1,2}/.*)\\.js$': '$1',

    // Mock heavy dependencies
    '^node-fetch$': '<rootDir>/__mocks__/node-fetch.js',
    '^pg$': '<rootDir>/__mocks__/pg.js',
    '^ioredis$': '<rootDir>/__mocks__/ioredis.js',
    '^puppeteer$': '<rootDir>/__mocks__/puppeteer.js',
    '^neo4j-driver$': '<rootDir>/__mocks__/neo4j-driver.js',
  },

  // Transform Configuration
  transform: {
    '^.+\\.[tj]sx?$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: {
          allowSyntheticDefaultImports: true,
          esModuleInterop: true,
        },
      },
    ],
  },

  transformIgnorePatterns: [
    'node_modules/(?!(.*\\.mjs$))',
  ],

  // Test Execution
  testTimeout: 30000,
  maxWorkers: process.env.CI ? 2 : '50%',
  maxConcurrency: 5,

  // Reporting
  reporters: [
    'default',
    [
      'jest-junit',
      {
        outputDirectory: '<rootDir>/test-results',
        outputName: 'junit-coverage.xml',
        classNameTemplate: '{classname}',
        titleTemplate: '{title}',
        ancestorSeparator: ' › ',
        usePathForSuiteName: true,
      },
    ],
  ],

  // Additional Options
  verbose: true,
  clearMocks: true,
  restoreMocks: true,
  resetMocks: true,
  bail: false,
  errorOnDeprecated: true,

  // Setup Files
  setupFilesAfterEnv: ['<rootDir>/tests/setup/jest.setup.js'],
};
