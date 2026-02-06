const baseConfig = require('./jest.config.cjs');

module.exports = {
  ...baseConfig,
  roots: ['src/graphrag/cpem', 'src/agents/cpem', 'tests/graphrag/cpem', 'tests/agents/cpem'],
  testMatch: [
    '**/tests/graphrag/cpem/**/*.test.ts',
    '**/tests/agents/cpem/**/*.test.ts',
  ],
  collectCoverageFrom: [
    'src/graphrag/cpem/**/*.ts',
    'src/agents/cpem/**/*.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 50,
      lines: 50,
      statements: 50,
    },
  },
};
