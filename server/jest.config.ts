import type { Config } from 'jest';

const config: Config = {
<<<<<<< HEAD
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  setupFilesAfterEnv: [
    '<rootDir>/tests/setup/jest.setup.js',
    // 'jest-extended/all' is loaded via require in jest.setup.js to handle resolution issues safely
=======
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  setupFilesAfterEnv: [
    '<rootDir>/tests/setup/jest.setup.ts',
    'jest-extended/all',
>>>>>>> main
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
  },
  resolver: '<rootDir>/tests/resolver.cjs',
  transform: {
    '^.+\\.[tj]sx?$': [
      'ts-jest',
      {
        useESM: true,
<<<<<<< HEAD
        tsconfig: 'tsconfig.json',
=======
<<<<<<< HEAD
        tsconfig: 'tsconfig.json',
=======
<<<<<<< HEAD
        tsconfig: 'tsconfig.json',
=======
<<<<<<< HEAD
        tsconfig: 'tsconfig.json',
=======
<<<<<<< HEAD
        tsconfig: {
            target: 'ES2022',
            module: 'ESNext',
            moduleResolution: 'node',
            esModuleInterop: true,
            allowSyntheticDefaultImports: true,
            resolveJsonModule: true,
            allowJs: true,
            sourceMap: true,
            lib: ['ES2022'],
            types: ['node', 'jest'],
        },
=======
<<<<<<< HEAD
        tsconfig: 'tsconfig.json',
=======
        tsconfig: 'tsconfig.test.json',
>>>>>>> main
>>>>>>> main
>>>>>>> main
>>>>>>> main
>>>>>>> main
>>>>>>> main
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
  // Restored original reporters and added json-summary
  coverageReporters: ['text', 'lcov', 'cobertura', 'json-summary'],
  coverageDirectory: '<rootDir>/coverage',
  testTimeout: 30000,
  globalSetup: '<rootDir>/tests/setup/globalSetup.cjs',
  globalTeardown: '<rootDir>/tests/setup/globalTeardown.cjs',
  verbose: true,
  clearMocks: true,
  restoreMocks: true,
  resetMocks: true,
  bail: false,
  errorOnDeprecated: true,
<<<<<<< HEAD
  transformIgnorePatterns: [
    'node_modules/(?!(.*\\.mjs$))',
  ],
=======
  transformIgnorePatterns: ['node_modules/(?!.*\\.mjs$|node-fetch|data-uri-to-buffer|fetch-blob|formdata-polyfill)'],
>>>>>>> main
  maxWorkers: process.env.CI ? 2 : '50%',
};

export default config;
