module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/tests/orchestrator/maestro.test.ts'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { useESM: true }],
  },
  moduleNameMapper: {
    '^uuid$': require.resolve('uuid'),
    // '^ioredis$': require.resolve('ioredis'),
  },
  transformIgnorePatterns: []
};
