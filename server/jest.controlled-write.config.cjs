module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/server/src/maestro/controlled-write/**/*.test.ts'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { useESM: true }],
  },
  transformIgnorePatterns: []
};
