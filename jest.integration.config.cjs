
module.exports = {
  displayName: 'integration',
  testEnvironment: 'node',
  roots: ['<rootDir>/integration-tests'],
  testMatch: ['**/*.test.js'],
  testPathIgnorePatterns: ['/node_modules/'],
  transform: {}, // No transforms for JS/CJS
  moduleFileExtensions: ['js', 'json', 'node'],
  testTimeout: 60000,
  setupFilesAfterEnv: [],
  // Ensure we don't accidentally pick up mocks
  automock: false,
  resetMocks: true,
  restoreMocks: true,
};
