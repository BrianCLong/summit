const baseConfig = require('../../jest.config.cjs');

module.exports = {
  ...baseConfig,
  rootDir: '../../',
  roots: ['<rootDir>/packages/db-migrations'],
  globals: {
    ...baseConfig.globals,
    'ts-jest': {
      ...(baseConfig.globals?.['ts-jest'] ?? {}),
      useESM: true,
      tsconfig: '<rootDir>/packages/db-migrations/tsconfig.json',
    },
  },
  coveragePathIgnorePatterns: [
    ...((baseConfig.coveragePathIgnorePatterns ?? [])),
    '<rootDir>/packages/db-migrations/src/adapters',
    '<rootDir>/packages/db-migrations/src/examples',
    '<rootDir>/packages/db-migrations/src/external.d.ts',
  ],
};
