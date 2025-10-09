const path = require('path');

/** @type {import('jest').Config} */
module.exports = {
  rootDir: path.resolve(__dirname, '..', '..'),
  // Keep the scan surface small
  roots: ['<rootDir>/server/src', '<rootDir>/tests'],

  testEnvironment: 'node',
  setupFiles: [
    'dotenv/config', // loads .env.test automatically if present
  ],
  setupFilesAfterEnv: [
    '<rootDir>/tests/integration/setup-tests.ts',
  ],

  transform: {
    '^.+\\.[tj]sx?$': [
      'ts-jest',
      { tsconfig: 'tests/tsconfig.tests.json', useESM: false, isolatedModules: true }
    ],
  },

  moduleNameMapper: {
    '^@server/(.*)$': '<rootDir>/server/src/$1',
    '^@tests/(.*)$': '<rootDir>/tests/$1',
    '^argon2$': '<rootDir>/__mocks__/argon2.ts', // keep heavy deps mocked
    '^archiver$': '<rootDir>/__mocks__/archiver.ts',
  },
  moduleDirectories: ['node_modules', '<rootDir>', '<rootDir>/server/src', '<rootDir>/src'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],

  // Only integration-ish suites
  testMatch: [
    '<rootDir>/tests/integration/**/?(*.)+(test|spec).[tj]s?(x)',
    '<rootDir>/tests/graphql/**/?(*.)+(test|spec).[tj]s?(x)',
    '<rootDir>/server/src/tests/integration/**/?(*.)+(test|spec).[tj]s?(x)',
    '<rootDir>/server/src/tests/graphql/**/?(*.)+(test|spec).[tj]s?(x)',
  ],

  // Keep UI/E2E/etc out of this lane
  testPathIgnorePatterns: [
    '/node_modules/', '/dist/', '/build/', '/coverage/', '/.next/',
    '/infra/', '/ops/', '/scripts/', '/.garage/', '/.disabled/',
    '/conductor-ui/', '/playwright/', '/e2e/', '/services/',
    '/server/src/maestro/', '/tests/federal/', '/server/src/tests/cluster/',
  ],
  modulePathIgnorePatterns: [
    '/dist/', '/build/', '/coverage/', '/.next/',
    '/infra/', '/ops/', '/scripts/', '/.garage/', '/.disabled/',
    '/conductor-ui/', '/playwright/', '/e2e/', '/services/',
    '/server/src/maestro/', '/tests/federal/', '/server/src/tests/cluster/',
  ],
  watchPathIgnorePatterns: ['/dist/', '/build/', '/coverage/', '/.next/', '/intelgraph/'],

  // Integration tuning
  maxWorkers: 1, // serial for determinism & low memory
  testTimeout: 60000, // slower I/O
  detectOpenHandles: true, // catch dangling servers/sockets
  cacheDirectory: '<rootDir>/.jest-cache-integration',
  verbose: false,

  // Optional JUnit (enable if you want artifacts)
  // reporters: [
  //   'default',
  //   ['jest-junit', { outputDirectory: './reports/junit', outputName: 'jest-integration.xml' }]
  // ],
};