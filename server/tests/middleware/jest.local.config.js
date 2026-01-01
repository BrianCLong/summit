import path from 'path';

export default {
  rootDir: process.cwd(),
  transform: {
    '^.+\.tsx?$': ['ts-jest', {
      useESM: true,
      tsconfig: 'server/tsconfig.test.json'
    }],
  },
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    '^(\.{1,2}/.*)\.js$': '',
  },
  testEnvironment: 'node',
  // setupFilesAfterEnv: ['<rootDir>/server/tests/middleware/jest.local.setup.js'], // Temporarily disable setup file to see if it runs
};
