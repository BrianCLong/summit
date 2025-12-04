/** @type {import('jest').Config} */
module.exports = {
  ...require('./jest.config.cjs'),
  testMatch: ['**/__tests__/**/*.integration.test.ts'],
  testTimeout: 30000,
};
