module.exports = {
  preset: 'ts-jest/presets/default-esm',
  extensionsToTreatAsEsm: ['.ts'],
  globals: {
    'ts-jest': {
      useESM: true,
      tsconfig: 'tsconfig.test.json',
    },
  },
  testEnvironment: 'jsdom',
  roots: ['server', 'client', 'packages', 'services', 'tests'],
  modulePathIgnorePatterns: [
    '<rootDir>/dist/',
    '<rootDir>/archive/',
    '<rootDir>/salvage/',
    '<rootDir>/pull/',
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/archive/',
    '/salvage/',
    '/pull/',
  ],
  watchPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/archive/',
    '/salvage/',
    '/pull/',
  ],
  collectCoverageFrom: [
    '**/*.{ts,tsx,js,jsx}',
    '!**/node_modules/**',
    '!**/dist/**',
    '!**/build/**',
    '!**/*.config.{js,ts}',
    '!**/coverage/**',
    '!**/archive/**',
    '!**/salvage/**',
    '!**/pull/**',
  ],
  // Coverage thresholds - PR quality gate enforcement
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
    // Critical paths require 85% coverage
    './server/src/middleware/**/*.ts': {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85,
    },
    './server/src/services/**/*.ts': {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85,
    },
  },
  testMatch: [
    '**/__tests__/**/*.{ts,tsx,js,jsx}',
    '**/?(*.)+(spec|test).{ts,tsx,js,jsx}',
  ],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '^node-fetch$': '<rootDir>/__mocks__/node-fetch.js',
    '^pg$': '<rootDir>/__mocks__/pg.js',
    '^ioredis$': '<rootDir>/__mocks__/ioredis.js',
    '^puppeteer$': '<rootDir>/__mocks__/puppeteer.js',
    '^@server/(.*)$': '<rootDir>/server/src/$1',
    '^@tests/(.*)$': '<rootDir>/tests/$1',
  },
  transformIgnorePatterns: ['node_modules/(?!(.*\\.mjs$))'],
  // Coverage thresholds - enforced globally
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 50,
      lines: 50,
      statements: 50,
    },
    // Stricter thresholds for security-critical services
    './server/src/security/**/*.ts': {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
    './server/src/services/AuthService.ts': {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  // Test timeout
  testTimeout: 30000,
  // Setup files
  setupFilesAfterEnv: ['<rootDir>/tests/utils/jest-setup.ts'],
};
