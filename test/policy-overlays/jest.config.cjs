module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '../../',
  testMatch: ['<rootDir>/test/policy-overlays/**/*.test.ts'],
  extensionsToTreatAsEsm: ['.ts', '.tsx', '.mts'],
  transform: {
    '^.+\\.[tj]sx?$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: 'tsconfig.test.json',
        isolatedModules: true,
      },
    ],
  },
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  setupFilesAfterEnv: ['<rootDir>/tests/utils/jest-setup.ts'],
};
