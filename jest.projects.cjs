const base = require('./jest.config.cjs');

const client = {
  displayName: 'client',
  ...base,
  roots: ['<rootDir>/client', '<rootDir>/packages'],
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
};

const server = {
  displayName: 'server',
  ...base,
  roots: ['<rootDir>/server'],
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
};

if (process.env.JEST_SCOPE === 'mc-learning') {
  const mcLearning = {
    displayName: 'mc-learning',
    ...base,
    roots: ['<rootDir>/server/src/tests', '<rootDir>/server/src/routes/__tests__'],
    testEnvironment: 'node',
    setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
    testMatch: [
      '<rootDir>/server/src/tests/mcLearningModule.test.ts',
      '<rootDir>/server/src/routes/__tests__/mcLearning.test.ts',
    ],
  };

  module.exports = { projects: [mcLearning] };
} else {
  module.exports = { projects: [client, server] };
}
