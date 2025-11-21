/**
 * Jest configuration for GraphQL Governance Tests
 *
 * Configures Jest to run TypeScript tests with proper coverage reporting
 */

module.exports = {
  // Use ts-jest preset for TypeScript support
  preset: 'ts-jest',

  // Test environment
  testEnvironment: 'node',

  // Root directory for tests
  rootDir: '..',

  // Test match patterns
  testMatch: [
    '<rootDir>/graphql/__tests__/**/*.test.ts',
    '<rootDir>/graphql/**/__tests__/**/*.test.ts',
  ],

  // Module paths
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/graphql/$1',
  },

  // Coverage configuration
  collectCoverageFrom: [
    'graphql/**/*.ts',
    '!graphql/**/*.d.ts',
    '!graphql/__tests__/**',
    '!graphql/examples/**',
    '!graphql/**/index.ts',
  ],

  coverageDirectory: '<rootDir>/coverage/graphql',

  coverageThresholds: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },

  // Coverage reporters
  coverageReporters: ['text', 'lcov', 'html', 'json-summary'],

  // Setup files
  setupFilesAfterEnv: ['<rootDir>/graphql/__tests__/setup.ts'],

  // Transform configuration
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: {
          esModuleInterop: true,
          allowSyntheticDefaultImports: true,
        },
      },
    ],
  },

  // Module file extensions
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],

  // Ignore patterns
  testPathIgnorePatterns: ['/node_modules/', '/dist/', '/coverage/'],

  // Verbose output
  verbose: true,

  // Timeout for async tests
  testTimeout: 10000,

  // Clear mocks between tests
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
};
