import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  setupFiles: ['<rootDir>/tests/setup/env.ts'],
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
  modulePathIgnorePatterns: ['<rootDir>/dist/'],
  moduleNameMapper: {
    '^jsdom$': '<rootDir>/tests/mocks/jsdom.ts',
    '.*diagnostic-snapshotter(\\.js)?$': '<rootDir>/tests/mocks/diagnostic-snapshotter.ts',
    '.*DeterministicExportService(\\.js)?$': '<rootDir>/tests/mocks/deterministic-export-service.ts',
    '.*PolicyEngine(\\.js)?$': '<rootDir>/tests/mocks/policy-engine.ts',
    '.*prompts/registry(\\.js)?$': '<rootDir>/tests/mocks/prompts-registry.ts',
    '.*insights/engagementCascade(\\.js)?$': '<rootDir>/tests/mocks/engagement-cascade.ts',
    '.*packages/shared/provenance(\\.js)?$': '<rootDir>/tests/mocks/provenance.ts',
    '.*logger(\\.js)?$': '<rootDir>/tests/mocks/logger.ts',
    '.*metrics/dbMetrics(\\.js)?$': '<rootDir>/tests/mocks/db-metrics.ts',
    '.*workers/eventBus(\\.js)?$': '<rootDir>/tests/mocks/eventBus.ts',
    '.*health/aggregator(\\.js)?$': '<rootDir>/tests/mocks/health-aggregator.ts',
    '^ioredis$': '<rootDir>/tests/mocks/ioredis.ts',
    '^pg-boss$': '<rootDir>/tests/mocks/pg-boss.ts',
    '.*scripts/maintenance(\\.js)?$': '<rootDir>/tests/mocks/maintenance.ts',

    '@intelgraph/feature-flags': '<rootDir>/tests/mocks/feature-flags.ts',
    '@intelgraph/attack-surface': '<rootDir>/tests/mocks/attack-surface.ts',
    '@packages/cache': '<rootDir>/tests/mocks/cache.ts',
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
    '!src/generated/**',
    '!src/**/__mocks__/**',
    '!src/**/*.d.ts',
  ],
  coverageProvider: 'v8',
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
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { useESM: true }],
    '^.+\\.js$': ['ts-jest', { useESM: true }],
  },
  transformIgnorePatterns: [
    'node_modules/(?!(\\.pnpm|p-limit|yocto-queue|node-fetch|data-uri-to-buffer|fetch-blob|formdata-polyfill|pptxgenjs|jszip|@exodus/bytes|jsdom|html-encoding-sniffer|pg-boss)/)',
  ],
  maxWorkers: process.env.CI ? 2 : '50%',
  // Limit worker memory to prevent OOM in CI
  workerIdleMemoryLimit: process.env.CI ? '512MB' : undefined,
  // Open handle detection - helps identify hanging tests
  detectOpenHandles: process.env.JEST_DETECT_HANDLES === 'true',
  // Force exit after tests complete (CI safety net for orphan handles)
  forceExit: process.env.CI === 'true',
};

export default config;
