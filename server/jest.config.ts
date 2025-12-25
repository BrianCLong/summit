import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
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
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@tests/(.*)$': '<rootDir>/tests/$1',
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transform: {
    '^.+\\.[tj]sx?$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: 'tsconfig.json',
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
  coverageThreshold: {
    global: {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85,
    },
  },
  coverageReporters: ['text', 'lcov', 'cobertura'],
  coverageDirectory: '<rootDir>/coverage',
  testTimeout: 30000,
  globalSetup: '<rootDir>/tests/setup/globalSetup.cjs',
  globalTeardown: '<rootDir>/tests/setup/globalTeardown.cjs',
  // testResultsProcessor: 'jest-junit', // Disabled to avoid dependency issues in environment
  reporters: [
    'default',
    // 'jest-junit', // Disabled
  ],
  verbose: true,
  clearMocks: true,
  restoreMocks: true,
  resetMocks: true,
  bail: false,
  errorOnDeprecated: true,
  transformIgnorePatterns: [
      // Allow transforming prometheus metrics file if needed, or other ESM modules
      // But mainly ensure that .js files in src are handled by ts-jest or babel-jest if mixed.
      // However, the issue is that `metrics.js` is an ESM file (uses `import`), but Jest treats .js as CJS by default unless type: module is respected or transformed.
      // Since `extensionsToTreatAsEsm` only lists `.ts`, maybe we need `.js` too or change transform logic.
      // Or we can tell ts-jest to process js files.
      'node_modules/(?!(@opentelemetry|d3|internmap|delaunator|robust-predicates))',
  ],
  maxWorkers: process.env.CI ? 2 : '50%',
};

export default config;
