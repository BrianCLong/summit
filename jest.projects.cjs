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

const mcLearning = {
  displayName: 'mc-learning',
  ...base,
  roots: ['<rootDir>/services/learner'],
  testEnvironment: 'node',
};

const scopeArg = process.argv.find(arg => arg === '--scope' || arg.startsWith('--scope='));
let projects = [client, server, mcLearning];

if (scopeArg) {
  const scopeValue = scopeArg.includes('=')
    ? scopeArg.split('=')[1]
    : process.argv[process.argv.indexOf(scopeArg) + 1];

  if (scopeValue === 'mc-learning') {
    projects = [mcLearning];
  }
}

module.exports = { projects };