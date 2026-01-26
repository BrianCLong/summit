const path = require('path');
const baseConfig = require('../../jest.config.cjs');

module.exports = {
  ...baseConfig,
  rootDir: path.resolve(__dirname, '../..'),
  roots: ['<rootDir>/apps/search-engine/src'],
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
  },
};
