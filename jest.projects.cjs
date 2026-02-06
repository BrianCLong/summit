const base = require('./jest.config.cjs');

const setupFilesAfterEnv = [
  '<rootDir>/tests/utils/jest-setup.cjs',
  '<rootDir>/jest.setup.js',
];

const client = {
  displayName: 'client',
  ...base,
  roots: ['<rootDir>/client', '<rootDir>/packages'],
  testEnvironment: 'jsdom',
  setupFilesAfterEnv,
  transform: {
    '^.+\\.(ts|tsx)$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: '<rootDir>/client/tsconfig.tests.json',
      },
    ],
    '^.+\\.(js|jsx)$': [
      'babel-jest',
      { configFile: '<rootDir>/client/babel.config.cjs' },
    ],
  },
};

const server = {
  displayName: 'server',
  ...base,
  roots: ['<rootDir>/server/src', '<rootDir>/server/tests', '<rootDir>/server/__tests__'],
  testEnvironment: 'node',
  setupFilesAfterEnv,
};

const services = {
  displayName: 'services',
  ...base,
  roots: ['<rootDir>/services'],
  testEnvironment: 'node',
  setupFilesAfterEnv,
};

const integration = {
  displayName: 'integration',
  ...base,
  roots: ['<rootDir>/tests'],
  testEnvironment: 'node',
  setupFilesAfterEnv,
};

const libs = {
  displayName: 'libs',
  ...base,
  roots: ['<rootDir>/libs'],
  testEnvironment: 'node',
  setupFilesAfterEnv,
};

module.exports = { projects: [client, server, services, integration, libs] };
