import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '.',
  testMatch: ['<rootDir>/test/**/*.test.ts'],
  collectCoverageFrom: ['src/**/*.ts'],
  coverageDirectory: '<rootDir>/coverage',
  clearMocks: true,
};

export default config;
