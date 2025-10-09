import type { Config } from 'jest';

const config: Config = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/test/setup-tests.ts'],
  moduleNameMapper: {
    '^argon2$': '<rootDir>/__mocks__/argon2.ts',
    '^archiver$': '<rootDir>/__mocks__/archiver.ts'
  },
  testMatch: ['<rootDir>/**/?(*.)+(test|spec).[jt]s?(x)'],
  // No quarantines here — we want signal
  maxWorkers: '50%'
};

export default config;
