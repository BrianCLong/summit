const path = require('path');

/** @type {import('jest').Config} */
const config = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: [path.resolve(__dirname, 'src/setupTests.js')],
  moduleNameMapper: {
    '\\.(css|less|sass|scss)$': 'identity-obj-proxy',
    '\\.(gif|ttf|eot|svg|png)$': '<rootDir>/__mocks__/fileMock.js',
    '^dompurify$': '<rootDir>/__mocks__/dompurify.js',
  },
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: {
        jsx: 'react-jsx',
        module: 'commonjs'
      }
    }],
    '^.+\\.(js|jsx)$': ['babel-jest', { configFile: path.resolve(__dirname, 'babel.config.cjs') }],
  },
  testMatch: [
    '<rootDir>/src/**/*.test.{js,jsx,ts,tsx}',
    '<rootDir>/src/**/__tests__/**/*.{js,jsx,ts,tsx}',
  ],

  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/index.ts',
    '!src/main.tsx', // Entry point
  ],
  coverageThreshold: {
    global: {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85,
    },
  },
  reporters: [
    'default',
    [
      'jest-junit',
      {
        outputDirectory: '<rootDir>/test-results',
        outputName: 'junit.xml',
        classNameTemplate: '{classname}',
        titleTemplate: '{title}',
        ancestorSeparator: ' › ',
        usePathForSuiteName: true,
      },
    ],
  ],
  transformIgnorePatterns: [
    '/node_modules/',
  ],
  testPathIgnorePatterns: [],



};

module.exports = config;
