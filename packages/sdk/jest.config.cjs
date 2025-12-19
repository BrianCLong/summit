const path = require('path');
const baseConfig = require('../../jest.config.cjs');

module.exports = {
  ...baseConfig,
  rootDir: path.resolve(__dirname, '../..'),
  roots: ['<rootDir>/packages/sdk/tests'],
  setupFilesAfterEnv: [],
  haste: {
    ...baseConfig.haste,
    throwOnModuleCollision: false,
  },
  testMatch: ['**/packages/sdk/tests/**/*.(test|spec).ts'],
};
