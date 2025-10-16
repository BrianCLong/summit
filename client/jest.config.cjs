/** @type {import('jest').Config} */
const config = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.js'],
  globals: {
    'ts-jest': {
      tsconfig: '<rootDir>/tsconfig.json',
    },
  },
  moduleNameMapper: {
    '\\.(css|less|sass|scss)$': 'identity-obj-proxy',
    '\\.(gif|ttf|eot|svg|png)$': '<rootDir>/__mocks__/fileMock.js',
    '^dompurify$': '<rootDir>/__mocks__/dompurify.js',
  },
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
    '^.+\\.(js|jsx)$': 'babel-jest', // Assuming you might have some JS/JSX files
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
  testPathIgnorePatterns: [
    '<rootDir>/src/tests/',
    '<rootDir>/src/__tests__/ServiceHealthCard.test.jsx',
    '<rootDir>/src/__tests__/Dashboard.test.jsx',
    '<rootDir>/src/components/graph/__tests__/GraphContextMenu.test.jsx',
    '<rootDir>/src/components/graph/__tests__/AIInsightsPanel.test.jsx',
    '<rootDir>/src/components/visualization/__tests__/InteractiveGraphCanvas.test.tsx',
    '<rootDir>/src/components/mlops/__tests__/ModelManagementDashboard.test.tsx',
    '<rootDir>/src/components/dashboard/__tests__/StatsOverview.test.tsx',
  ],
};

module.exports = config;
