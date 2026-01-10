
import type { Config } from 'jest';
import fs from 'fs';
import path from 'path';

// Read quarantine list
const quarantinePath = path.join(__dirname, 'tests/quarantine/list.json');
let quarantineList: string[] = [];
try {
  if (fs.existsSync(quarantinePath)) {
    const data = fs.readFileSync(quarantinePath, 'utf8');
    quarantineList = JSON.parse(data).tests.map((t: any) => t.id);
  }
} catch (e: any) {
  console.warn('Failed to load quarantine list:', e.message);
}

// Create a regex to skip these tests
// Jest 'testNamePattern' filters run ONLY matching tests.
// To exclude, we unfortunately can't use testNamePattern negatively in config easily without CLI.
// However, we can inject a global to skip them.

const config: Config = {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  setupFilesAfterEnv: [
    '<rootDir>/tests/setup/jest.setup.cjs',
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
  testResultsProcessor: 'jest-junit',
  reporters: [
    'default',
    [
      'jest-junit',
      {
        outputDirectory: '<rootDir>/test-results',
        outputName: 'junit.xml',
        classNameTemplate: '{classname}',
        titleTemplate: '{title}',
        ancestorSeparator: ' › ',
        usePathForSuiteName: true,
      },
    ],
  ],
  verbose: true,
  clearMocks: true,
  restoreMocks: true,
  resetMocks: true,
  bail: false,
  errorOnDeprecated: true,
  transformIgnorePatterns: ['node_modules/(?!(.*\\.mjs$))'],
  maxWorkers: process.env.CI ? 2 : '50%',
  // Inject quarantine list into globals so setup file can skip them
  globals: {
    __QUARANTINED_TESTS__: quarantineList
  }
};

export default config;
