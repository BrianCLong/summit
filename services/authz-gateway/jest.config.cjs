module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  transform: {
    '^.+\\.(ts|tsx)$': [
      'ts-jest',
      { tsconfig: 'tsconfig.json', diagnostics: false, isolatedModules: true },
    ],
  },
  collectCoverageFrom: ['src/**/*.ts'],
  coverageThreshold: {
    global: { lines: 70 },
  },
  moduleNameMapper: {
    '^jose(?:/node/cjs)?$': '<rootDir>/tests/mocks/jose.ts',
    '^@opentelemetry/core$': '<rootDir>/tests/mocks/opentelemetry-core.ts',
    '^../src/observability$': '<rootDir>/tests/mocks/observability.ts',
    '^./observability$': '<rootDir>/tests/mocks/observability.ts',
  },
};
