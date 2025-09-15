import type { Config } from 'jest';

const config: Config = {
  testEnvironment: 'jsdom',
  testEnvironmentOptions: { url: 'http://localhost' },
  setupFilesAfterEnv: ['<rootDir>/test/setup-env.ts'],
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
  transform: {
    '^.+\\.(t|j)sx?$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.json' }],
  },
  testTimeout: 15000,
  restoreMocks: true,
  clearMocks: true,
  moduleNameMapper: {
    '^@app/(.*)$': '<rootDir>/../src/$1',
    '^@ui/(.*)$': '<rootDir>/src/$1',
  },
};

export default config;
