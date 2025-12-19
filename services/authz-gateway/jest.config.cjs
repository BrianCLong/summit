module.exports = {
  preset: './node_modules/ts-jest/presets/default-esm/jest-preset',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  transform: {
    '^.+\\.(ts|tsx)$': [
      'ts-jest',
      { tsconfig: 'tsconfig.json', useESM: true },
    ],
  },
  extensionsToTreatAsEsm: ['.ts'],
  transformIgnorePatterns: ['/node_modules/(?!jose)/'],
  moduleNameMapper: {
    '^jose$': '<rootDir>/tests/jose-mock.ts',
    '^\\.\\/observability$': '<rootDir>/tests/observability-stub.ts',
    '^\\.\\.\\/src\\/observability$': '<rootDir>/tests/observability-stub.ts',
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  collectCoverageFrom: ['src/**/*.ts'],
  coverageThreshold: {
    global: { lines: 70 },
  },
};
