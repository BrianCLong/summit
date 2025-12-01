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

const services = {
  displayName: 'services',
  ...base,
  roots: ['<rootDir>/services'],
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
};

const integration = {
  displayName: 'integration',
  ...base,
  roots: ['<rootDir>/tests'],
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
};

module.exports = { projects: [client, server, services, integration] };
