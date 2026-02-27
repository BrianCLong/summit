const path = require('path');

module.exports = {
  preset: 'ts-jest/presets/default-esm', // Use ESM preset
  testEnvironment: 'node',
  roots: ['.'],
  testMatch: ['**/*.test.ts'],
  transform: {
    '^.+\.[tj]sx?$': [
      'ts-jest',
      {
        useESM: true, // Enable ESM support in ts-jest
        tsconfig: path.join(__dirname, '../../tsconfig.test.json'),
      },
    ],
  },
  moduleNameMapper: {
    '^(\.{1,2}/.*)\.js$': '$1', // Handle .js extensions in imports
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  extensionsToTreatAsEsm: ['.ts'],
};
