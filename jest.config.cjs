process.env.NODE_ENV = 'test';

module.exports = {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts', '.tsx', '.mts'],
  transform: {
    '^.+\\.[cm]?[tj]sx?$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: 'tsconfig.test.json',
      },
    ],
  },
  roots: ['server', 'client', 'packages', 'services', 'tests', 'scripts', 'libs', 'prompts'],
  modulePathIgnorePatterns: [
    '<rootDir>/dist/',
    '<rootDir>/server/dist/',
    '<rootDir>/server/packages_tmp/',
    '<rootDir>/archive/',
    '<rootDir>/salvage/',
    '<rootDir>/pull/',
    '<rootDir>/packages/cli/',
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/server/dist/',
    '/server/packages_tmp/',
    '/tests/e2e/',
    '/archive/',
    '/salvage/',
    '/pull/',
  ],
  watchPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/server/dist/',
    '/server/packages_tmp/',
    '/tests/e2e/',
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
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
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
    '^node-fetch$': '<rootDir>/__mocks__/node-fetch.cjs',
    '^pg$': '<rootDir>/__mocks__/pg.js',
    '^ioredis$': '<rootDir>/__mocks__/ioredis.js',
    '^puppeteer$': '<rootDir>/__mocks__/puppeteer.js',
    '^@server/(.*)$': '<rootDir>/server/src/$1',
    '^@tests/(.*)$': '<rootDir>/tests/$1',
    '^@intelgraph/provenance$': '<rootDir>/packages/provenance/src/index.ts',
    '^@intelgraph/datalab-service$':
      '<rootDir>/services/datalab-service/src/index.ts',
    '^@intelgraph/sandbox-tenant-profile$':
      '<rootDir>/services/sandbox-tenant-profile/src/index.ts',
    '^@intelgraph/(.*)$': '<rootDir>/packages/$1/src/index.ts',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(uuid|node-fetch|data-uri-to-buffer|fetch-blob|formdata-polyfill|.*\\.mjs$))',
    '<rootDir>/.disabled/',
    '<rootDir>/apps/.mobile-native-disabled/',
    '<rootDir>/apps/.desktop-electron-disabled/',
  ],
  testEnvironmentOptions: {
    customExportConditions: ['node', 'node-addons', 'default'],
  },
  setupFilesAfterEnv: ['<rootDir>/tests/utils/jest-setup.cjs'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
};
