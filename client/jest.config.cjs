/** @type {import('jest').Config} */
const config = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.js'],
  moduleNameMapper: {
    '\\.(css|less|sass|scss)$': 'identity-obj-proxy',
    '\\.(gif|ttf|eot|svg|png)$': '<rootDir>/__mocks__/fileMock.js',
    '^ansi-regex$': '<rootDir>/__mocks__/ansi-regex.js',
    '^.+/config/env\\.js$': '<rootDir>/__mocks__/env.js',
    '^.+/config/env$': '<rootDir>/__mocks__/env.js',
    '^\\./env\\.js$': '<rootDir>/__mocks__/env.js',
    '^.+/generated/graphql\\.js$': '<rootDir>/__mocks__/generated-graphql.js',
    '^dompurify$': '<rootDir>/__mocks__/dompurify.js',
    '^react-window$': '<rootDir>/__mocks__/react-window.js',
    '^react$': '<rootDir>/../node_modules/react/index.js',
    '^react/jsx-runtime$': '<rootDir>/../node_modules/react/jsx-runtime.js',
    '^react/jsx-dev-runtime$': '<rootDir>/../node_modules/react/jsx-dev-runtime.js',
    '^react-dom/(.*)$': '<rootDir>/../node_modules/react-dom/$1',
    '^react-dom$': '<rootDir>/../node_modules/react-dom/index.js',
    '^react-router-dom$': '<rootDir>/../node_modules/react-router-dom/dist/index.js',
    '^react-router$': '<rootDir>/../node_modules/react-router/dist/development/index.js',
    '^react-redux$': '<rootDir>/../node_modules/react-redux/dist/cjs/index.js',
    '^@emotion/react$': '<rootDir>/../node_modules/@emotion/react/dist/emotion-react.cjs.js',
    '^@emotion/styled$': '<rootDir>/../node_modules/@emotion/styled/dist/emotion-styled.cjs.js',
  },
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: {
        jsx: 'react-jsx'
      }
    }],
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
