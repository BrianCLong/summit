module.exports = {
  preset: 'ts-jest/presets/default-esm',
  extensionsToTreatAsEsm: ['.ts'],
  globals: {
    'ts-jest': {
      useESM: true,
    },
  },
  testEnvironment: 'node',
  collectCoverageFrom: [
    '**/*.{ts,tsx,js,jsx}',
    '!**/node_modules/**',
    '!**/dist/**',
    '!**/build/**',
    '!**/*.config.{js,ts}',
    '!**/coverage/**',
  ],
  testMatch: [
    '**/__tests__/**/*.{ts,tsx,js,jsx}',
    '**/?(*.)+(spec|test).{ts,tsx,js,jsx}',
  ],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transformIgnorePatterns: ['node_modules/(?!(.*\\.mjs$))'],
  projects: [
    {
      displayName: 'server',
      testMatch: ['<rootDir>/server/**/*.{test,spec}.{js,ts}'],
      preset: 'ts-jest/presets/default-esm',
      extensionsToTreatAsEsm: ['.ts'],
      globals: {
        'ts-jest': {
          useESM: true,
        },
      },
    },
    {
      displayName: 'client',
      testMatch: ['<rootDir>/client/**/*.{test,spec}.{js,jsx,ts,tsx}'],
      testEnvironment: 'jsdom',
      setupFilesAfterEnv: ['<rootDir>/client/src/setupTests.js'],
    },
    {
      displayName: 'jtdl',
      testMatch: ['<rootDir>/tools/jtdl/tests/**/*.test.ts'],
      preset: 'ts-jest/presets/default-esm',
      extensionsToTreatAsEsm: ['.ts'],
      testEnvironment: 'node',
      roots: ['<rootDir>/tools/jtdl'],
      modulePathIgnorePatterns: [
        '<rootDir>/archive',
        '<rootDir>/archive_20250926',
        '<rootDir>/intelgraph',
      ],
      moduleNameMapper: {
        '^(\\.{1,2}/.*)\\.js$': '$1',
      },
      globals: {
        'ts-jest': {
          useESM: true,
          tsconfig: '<rootDir>/tools/jtdl/tsconfig.jest.json',
        },
      },
    },
  ],
};
