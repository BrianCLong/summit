const path = require('path');

module.exports = {
  preset: 'ts-jest/presets/default-esm', // Use ESM preset
  testEnvironment: 'node',
  roots: ['.'],
  testMatch: ['**/*.test.ts'],
  extensionsToTreatAsEsm: ['.ts'],
  transform: {
    '^.+\.[tj]sx?$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: path.join(__dirname, '../../tsconfig.test.json'),
      },
    ],
  },
  moduleNameMapper: {
    '^(\.{1,2}/.*)\.js$': '$1',
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
};
