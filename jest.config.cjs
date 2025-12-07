/**
 * Jest Base Configuration
 *
 * This is the base configuration required by jest.projects.cjs.
 * Uses CommonJS for broader compatibility across the monorepo.
 *
 * @see jest.projects.cjs - Multi-project configuration
 * @see jest.coverage.config.cjs - Coverage-specific configuration
 * @see tsconfig.test.json - TypeScript test configuration
 */

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',

  // Test Discovery
  testMatch: [
    '**/__tests__/**/*.{ts,tsx,js,jsx}',
    '**/?(*.)+(spec|test).{ts,tsx,js,jsx}',
  ],

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
    '/playwright-tests/',
  ],

  modulePathIgnorePatterns: [
    '<rootDir>/dist/',
    '<rootDir>/build/',
    '<rootDir>/archive/',
    '<rootDir>/salvage/',
    '<rootDir>/pull/',
  ],

  // Module Resolution
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/server/src/$1',
    '^@client/(.*)$': '<rootDir>/client/src/$1',
    '^@tests/(.*)$': '<rootDir>/tests/$1',
    '^@server/(.*)$': '<rootDir>/server/src/$1',
    '^@services/(.*)$': '<rootDir>/services/$1',
    // Handle ESM imports with .js extension
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },

  // Transform Configuration - CommonJS mode for stability
  transform: {
    '^.+\\.[tj]sx?$': [
      'ts-jest',
      {
        useESM: false,
        tsconfig: 'tsconfig.test.json',
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

  // Mocking Behavior
  clearMocks: true,
  restoreMocks: true,
  resetMocks: true,

  // Reporting
  verbose: true,
  bail: false,
  errorOnDeprecated: true,

  // Coverage Configuration (when enabled)
  collectCoverageFrom: [
    'src/**/*.{ts,tsx,js,jsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/dist/**',
    '!**/build/**',
    '!**/coverage/**',
    '!**/*.config.{js,ts,cjs,mjs}',
    '!**/tests/**',
    '!**/__tests__/**',
    '!**/__mocks__/**',
  ],

  coverageDirectory: '<rootDir>/coverage',
  coverageReporters: ['text', 'text-summary', 'lcov', 'cobertura'],
};
