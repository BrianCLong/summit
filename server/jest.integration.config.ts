import config from './jest.config.ts';

const integrationConfig = {
  ...config,
  // Clear moduleNameMapper to avoid mocking DB drivers
  moduleNameMapper: {
    // Keep some utils if necessary, but exclude drivers
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@tests/(.*)$': '<rootDir>/tests/$1',
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  // Ensure we run the integration tests
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.integration.test.ts',
    '<rootDir>/src/**/__tests__/integration.test.ts',
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
  ],
  setupFilesAfterEnv: [
    '<rootDir>/tests/setup/jest.integration.setup.cjs',
  ],
};

export default integrationConfig;
