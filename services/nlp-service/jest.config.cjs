/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/*.test.ts', '**/*.spec.ts'],
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: 'tsconfig.json',
      },
    ],
  },
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '^@intelgraph/nlp$': '<rootDir>/../../packages/nlp/src/index.ts',
    '^@intelgraph/entity-extraction$': '<rootDir>/../../packages/entity-extraction/src/index.ts',
    '^@intelgraph/text-analytics$': '<rootDir>/../../packages/text-analytics/src/index.ts',
    '^@intelgraph/language-models$': '<rootDir>/../../packages/language-models/src/index.ts',
  },
  extensionsToTreatAsEsm: ['.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/*.test.ts',
  ],
};
