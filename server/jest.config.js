/**
 * Jest Configuration for IntelGraph Server
 */
export default {
  // preset: 'ts-jest/presets/default-esm', // Removed due to resolution issues
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  setupFilesAfterEnv: [
    '<rootDir>/tests/setup/jest.setup.js',
    // 'jest-extended/all', // Removed from config, will add to setup file directly
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
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@tests/(.*)$': '<rootDir>/tests/$1',
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transform: {
    // '^.+\\.tsx?$': [
    //   'ts-jest',
    //   {
    //     useESM: true,
    //     tsconfig: {
    //       module: 'nodenext',
    //       target: 'es2020',
    //       allowJs: true
    //     },
    //   },
    // ],
    // Fallback to babel-jest which might be installed
    '^.+\\.(ts|tsx|js|jsx)$': 'babel-jest',
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
  // testResultsProcessor: 'jest-junit', // Removed missing dependency
  reporters: [
    'default',
    // [
    //   'jest-junit',
    //   {
    //     outputDirectory: '<rootDir>/test-results',
    //     outputName: 'junit.xml',
    //     classNameTemplate: '{classname}',
    //     titleTemplate: '{title}',
    //     ancestorSeparator: ' › ',
    //     usePathForSuiteName: true,
    //   },
    // ],
  ],
  verbose: true,
  clearMocks: true,
  restoreMocks: true,
  resetMocks: true,
  bail: false,
  errorOnDeprecated: true,
  transformIgnorePatterns: ['node_modules/(?!(.*\\.mjs$))'],
  maxWorkers: process.env.CI ? 2 : '50%',
};
