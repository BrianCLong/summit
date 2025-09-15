import type { Config } from 'jest';

const config: Config = {
  testEnvironment: 'jsdom',
  testEnvironmentOptions: { url: 'http://localhost' },
  setupFilesAfterEnv: ['<rootDir>/test/setup-env.ts'],
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
  transform: {
    '^.+\\.(t|j)sx?$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.json' }],
  },
};

export default config;

