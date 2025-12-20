import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: 'tsconfig.json',
        isolatedModules: true, // Speed up tests
      },
    ],
  },
  transformIgnorePatterns: ['node_modules/(?!(bullmq|ioredis|uuid|@bull-board)/)'],
  testMatch: [
      '<rootDir>/tests/**/*.test.ts',
      '<rootDir>/src/tests/**/*.test.ts'
  ],
};

export default config;
