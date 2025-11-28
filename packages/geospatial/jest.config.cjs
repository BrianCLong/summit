const path = require('path');

module.exports = {
  testEnvironment: 'node',
  rootDir: __dirname,
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts'],
  transform: {
    '^.+\\.ts$': path.join(__dirname, 'jest-transformer.cjs'),
  },
  moduleFileExtensions: ['ts', 'js', 'json'],
};
