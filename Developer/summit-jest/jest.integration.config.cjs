const path = require('path');

/** @type {import('jest').Config} */
module.exports = {
  rootDir: path.resolve(__dirname, '..', '..'),
  roots: ['<rootDir>/server/src', '<rootDir>/tests'],
  testEnvironment: 'node',
  setupFiles: ['dotenv/config'],
  setupFilesAfterEnv: ['<rootDir>/tests/integration/setup-tests.ts'],
  transform: {
    '^.+\\.[tj]sx?$': [
      'ts-jest',
      { tsconfig: 'tests/tsconfig.tests.json', useESM: false, isolatedModules: true }
    ],
  },
  moduleNameMapper: {
    '^@server/(.*)$': '<rootDir>/server/src/$1',
    '^@tests/(.*)$': '<rootDir>/tests/$1',
    '^argon2$': '<rootDir>/__mocks__/argon2.ts',
    '^archiver$': '<rootDir>/__mocks__/archiver.js',
  },
  moduleDirectories: ['node_modules', '<rootDir>', '<rootDir>/server/src', '<rootDir>/src'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  testMatch: [
    '<rootDir>/tests/integration/**/?(*.)+(test|spec).[tj]s?(x)',
    '<rootDir>/tests/graphql/**/?(*.)+(test|spec).[tj]s?(x)',
    '<rootDir>/server/src/tests/integration/**/?(*.)+(test|spec).[tj]s?(x)',
    '<rootDir>/server/src/tests/graphql/**/?(*.)+(test|spec).[tj]s?(x)'
  ],
  testPathIgnorePatterns: [
    '/node_modules/', '/dist/', '/build/', '/coverage/', '/.next/',
    '/infra/', '/ops/', '/scripts/', '/.garage/', '/.disabled/',
    '/conductor-ui/', '/playwright/', '/e2e/', '/services/',
    '/server/src/maestro/', '/tests/federal/', '/server/src/tests/cluster/'
  ],
  modulePathIgnorePatterns: [
    '/dist/', '/build/', '/coverage/', '/.next/',
    '/infra/', '/ops/', '/scripts/', '/.garage/', '/.disabled/',
    '/conductor-ui/', '/playwright/', '/e2e/', '/services/',
    '/server/src/maestro/', '/tests/federal/', '/server/src/tests/cluster/'
  ],
  watchPathIgnorePatterns: ['/dist/', '/build/', '/coverage/', '/.next/', '/intelgraph/'],
  maxWorkers: 1,
  testTimeout: 60000,
  detectOpenHandles: true,
  cacheDirectory: '<rootDir>/.jest-cache-integration',
  verbose: false,
};
