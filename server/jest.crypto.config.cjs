/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  setupFilesAfterEnv: [],
  transform: {
    '^.+\\.[tj]s$': [
      'ts-jest',
      {
        useESM: true,
      },
    ],
  },
  testMatch: ['<rootDir>/tests/security/*.test.ts'],
};
