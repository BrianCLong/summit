module.exports = {
  testMatch: ['**/__tests__/**/*.test.cjs'],
  testEnvironment: 'node',
  collectCoverageFrom: ['scripts/**/*.cjs'],
  verbose: false,
  modulePathIgnorePatterns: [
    '<rootDir>/archive_legacy',
    '<rootDir>/intelgraph',
    '<rootDir>/.disabled',
  ],
  transform: {},
};
