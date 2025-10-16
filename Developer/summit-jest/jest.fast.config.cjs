const path = require('path');

module.exports = {
  rootDir: path.resolve(__dirname, '..', '..'),
  preset: 'ts-jest/presets/default-esm',
  extensionsToTreatAsEsm: ['.ts'],
  globals: {
    'ts-jest': {
      useESM: true,
    },
  },
  testEnvironment: 'node',
  roots: ['<rootDir>/server', '<rootDir>/client', '<rootDir>/packages'],
  modulePathIgnorePatterns: [
    '<rootDir>/dist/',
    '<rootDir>/archive/',
    '<rootDir>/archive_20250926/',
    '<rootDir>/salvage/',
    '<rootDir>/pull/',
    '/node_modules/',
    '/build/',
    '/coverage/',
    '/.next/',
    '/infra/',
    '/ops/',
    '/scripts/',
    '/.garage/',
    '/.disabled/',
    '/intelgraph/',
    '/vpc/',
    '/docs/',
    '/examples/',
    '/fixtures/',
    '/conductor-ui/',
    '/playwright/',
    '/e2e/',
    // '/services/', '/server/src/maestro/', '/tests/federal/', '/server/src/tests/cluster/',
    '/server/src/maestro/',
    '/tests/federal/',
    '/server/src/tests/cluster/',
  ],
  testPathIgnorePatterns: [
    '<rootDir>/conductor-ui/',
    '<rootDir>/playwright/',
    '<rootDir>/e2e/',
    // '<rootDir>/services/',
    '<rootDir>/server/src/maestro/',
    '<rootDir>/tests/federal/',
    // Note: Removed utils folder from ignore patterns to re-include in Fast Lane
    // '<rootDir>/server/src/tests/utils/',
    // Note: Removed plugin folder from ignore patterns to re-include in Fast Lane
  ],
  watchPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/archive/',
    '/archive_20250926/',
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
    '!**/archive_20250926/**',
    '!**/salvage/**',
    '!**/pull/**',
  ],
  testMatch: [
    '**/__tests__/**/*.{ts,tsx,js,jsx}',
    '**/?(*.)+(spec|test).{ts,tsx,js,jsx}',
  ],
  moduleNameMapper: {
    '^@server/(.*)$': '<rootDir>/server/src/$1',
    '^@tests/(.*)$': '<rootDir>/tests/$1',
    // Defensive mappers; harmless if unused by utils tests:
    '^argon2$': '<rootDir>/__mocks__/argon2.ts',
    '^archiver$': '<rootDir>/tests/integration/__mocks__/archiver.ts',
    '^uuid$': '<rootDir>/__mocks__/uuid.ts',
    // Additional defensive mappers for services tests:
    '^node-fetch$': '<rootDir>/__mocks__/node-fetch.ts',
    '^neo4j-driver$': '<rootDir>/__mocks__/neo4j-driver.ts',
  },
  moduleDirectories: [
    'node_modules',
    '<rootDir>',
    '<rootDir>/server/src',
    '<rootDir>/src',
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],

  // Keep memory bounded as we expand coverage
  maxWorkers: Math.max(1, Math.floor(require('os').cpus().length * 0.5)),
  cacheDirectory: '<rootDir>/.jest-cache-fast',
};
