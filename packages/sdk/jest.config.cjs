const baseConfig = require('../../jest.config.cjs');

module.exports = {
  ...baseConfig,
  rootDir: '../..',
  testMatch: ['**/packages/sdk/tests/**/*.(test|spec).ts'],
  setupFilesAfterEnv: [],
  transform: {
    ...baseConfig.transform,
    '^.+\\.[tj]sx?$': [
      'ts-jest',
      {
        ...baseConfig.transform['^.+\\.[tj]sx?$'][1],
        tsconfig: 'tsconfig.test.json',
      },
    ],
  },
};
