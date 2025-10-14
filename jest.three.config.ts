import type { Config } from 'jest';

const config: Config = {
  roots: ['<rootDir>/server/src', '<rootDir>/tests'],
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/test/setup-tests.ts'],
  transform: {
    '^.+\\.[tj]sx?$': [
      'ts-jest',
      {
        tsconfig: 'tsconfig.base.json',
        useESM: false,
        isolatedModules: true,
      },
    ],
  },
  moduleNameMapper: {
    '^@server/(.*)$': '<rootDir>/server/$1',
    '^@tests/(.*)$': '<rootDir>/tests/$1',
    '^argon2$': '<rootDir>/__mocks__/argon2.ts',
    '^archiver$': '<rootDir>/__mocks__/archiver.ts',
  },
  moduleDirectories: ['node_modules', '<rootDir>', '<rootDir>/server/src', '<rootDir>/server'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  testMatch: [
    '<rootDir>/tests/tenant/isolation.test.ts',
    '<rootDir>/server/src/tests/enterpriseSecurity.test.js',
    '<rootDir>/server/src/tests/entityModelStructure.test.js',
  ],
  testPathIgnorePatterns: [
    '/node_modules/', '/dist/', '/build/', '/coverage/', '/.next/',
    '/infra/', '/ops/', '/scripts/', '/.garage/', '/.disabled/',
    '/intelgraph/', '/vpc/', '/docs/', '/examples/', '/fixtures/',
  ],
  modulePathIgnorePatterns: [
    '/dist/', '/build/', '/coverage/', '/.next/',
    '/infra/', '/ops/', '/scripts/', '/.garage/', '/.disabled/',
    '/intelgraph/', '/vpc/', '/docs/', '/examples/', '/fixtures/',
  ],
  watchPathIgnorePatterns: [
    '/dist/', '/build/', '/coverage/', '/.next/', '/intelgraph/',
  ],
  maxWorkers: 1,
  cacheDirectory: '<rootDir>/.jest-cache-three',
  cache: true,
  verbose: false,
};

export default config;
