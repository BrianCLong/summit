const base = require('../../jest.config.cjs');

module.exports = {
  ...base,
  displayName: 'workflow-engine',
  rootDir: __dirname,
  roots: ['<rootDir>/src'],
  testMatch: ['<rootDir>/src/**/*.test.ts'],
  setupFilesAfterEnv: [],
  transform: {
    '^.+\\.(t|j)sx?$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: '<rootDir>/tsconfig.json',
      },
    ],
  },
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
};
