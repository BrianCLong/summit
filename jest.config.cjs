module.exports = {
  transform: {
    '^.+\.(ts|tsx)
: '@swc/jest',
  },
  testEnvironment: 'node',
  reporters: ['default', ['jest-junit', { outputDirectory: 'reports/junit' }]],
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov'],
  collectCoverageFrom: [
    '**/*.{ts,tsx,js,jsx}',
    '!**/node_modules/**',
    '!**/dist/**',
    '!**/build/**',
    '!**/*.config.{js,ts}',
    '!**/coverage/**',
  ],
  testMatch: ['**/__tests__/**/*.{ts,tsx,js,jsx}', '**/?(*.)+(spec|test).{ts,tsx,js,jsx}'],
  moduleNameMapping: {
    '^(\.{1,2}/.*)\.js
: '$1',
  },
  transformIgnorePatterns: ['node_modules/(?!(.*\.mjs$))'],
  projects: [
    {
      displayName: 'server',
      testMatch: ['<rootDir>/server/**/*.{test,spec}.{js,ts}'],
      transform: {
        '^.+\.(ts|tsx)
: '@swc/jest',
      },
    },
    {
      displayName: 'client',
      testMatch: ['<rootDir>/client/**/*.{test,spec}.{js,jsx,ts,tsx}'],
      testEnvironment: 'jsdom',
      setupFilesAfterEnv: ['<rootDir>/client/src/setupTests.js'],
    },
  ],
};
