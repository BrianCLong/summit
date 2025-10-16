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

module.exports = { projects: [client, server] };
