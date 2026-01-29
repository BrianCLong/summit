const path = require('path');
const baseConfig = require('../../jest.config.cjs');

module.exports = {
  ...baseConfig,
  rootDir: path.resolve(__dirname, '../..'),
  roots: ['<rootDir>/apps/analytics-engine/src'],
  testEnvironment: 'node',
  transform: {
    '^.+\\.[cm]?[tj]sx?$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: path.resolve(__dirname, '../../tsconfig.test.json'),
      },
    ],
  },
  moduleNameMapper: {
    ...baseConfig.moduleNameMapper,
    '^pg$': '<rootDir>/__mocks__/pg.js',
  },
};
