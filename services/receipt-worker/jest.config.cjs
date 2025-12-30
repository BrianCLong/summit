/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.js'],
  roots: ['<rootDir>/dist'],
  moduleNameMapper: {
    '^@intelgraph/provenance$': '<rootDir>/../../packages/provenance/dist/src',
    '^prom-client$': '<rootDir>/dist/__mocks__/prom-client.js',
  },
  clearMocks: true,
};
