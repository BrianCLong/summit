const path = require('node:path');

module.exports = {
  testEnvironment: 'node',
  roots: [__dirname],
  testMatch: ['**/connector-contracts.test.js'],
  moduleFileExtensions: ['js', 'json'],
  setupFilesAfterEnv: [],
  transform: {},
  reporters: ['default'],
  coverageDirectory: path.join(__dirname, '../../coverage/connector-contracts'),
  collectCoverageFrom: ['**/*.js'],
};
