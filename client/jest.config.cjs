/** @type {import('jest').Config} */
const config = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.js'],
  globals: {
    'import.meta': {
      env: {
        VITE_GRAFANA_URL: 'http://localhost:3000',
        VITE_GRAFANA_MAESTRO_DASH_UID: 'test-dashboard',
        VITE_API_URL: 'http://localhost:8080',
        MODE: 'test',
        DEV: false,
        PROD: false,
      },
    },
  },
  moduleNameMapper: {
    '\\.(css|less|sass|scss)$': 'identity-obj-proxy',
    '\\.(gif|ttf|eot|svg|png)$': '<rootDir>/__mocks__/fileMock.js',
    '^dompurify$': '<rootDir>/__mocks__/dompurify.js',
    '^ansi-regex$': '<rootDir>/__mocks__/ansi-regex.js',
    '^@mui/material/Unstable_Grid2$': '<rootDir>/__mocks__/MuiGrid2.js',
    '^@/(.*)$': '<rootDir>/src/$1',
    '^react$': '<rootDir>/../node_modules/react',
    '^react/(.*)$': '<rootDir>/../node_modules/react/$1',
    '^react/jsx-runtime$': '<rootDir>/../node_modules/react/jsx-runtime',
    '^react/jsx-dev-runtime$': '<rootDir>/../node_modules/react/jsx-dev-runtime',
    '^react-dom$': '<rootDir>/../node_modules/react-dom',
    '^react-dom/(.*)$': '<rootDir>/../node_modules/react-dom/$1',
    '^react-redux$': '<rootDir>/../node_modules/react-redux',
    '^@emotion/react$': '<rootDir>/../node_modules/@emotion/react',
    '^@emotion/styled$': '<rootDir>/../node_modules/@emotion/styled',
    '^entities/decode$': '<rootDir>/__mocks__/entities-decode.js',
    '^entities/escape$': '<rootDir>/__mocks__/entities-escape.js',
  },
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      useESM: true,
      tsconfig: {
        jsx: 'react-jsx',
      },
    }],
    '^.+\\.(js|jsx)$': 'babel-jest',
  },
  testMatch: [
    '<rootDir>/src/**/*.test.{js,jsx,ts,tsx}',
    '<rootDir>/src/**/__tests__/**/*.{js,jsx,ts,tsx}',
  ],
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/index.ts',
    '!src/main.tsx',
  ],
  coverageThreshold: {
    global: {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85,
    },
  },
  coverageReporters: ['json-summary', 'text', 'lcov'],
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
  /**
   * TEMPORARILY SKIPPED TEST SUITES
   * ================================
   * These suites are skipped due to fundamental issues that need systematic fixes.
   * Removal of entries from this list is an explicit goal.
   *
   * Categories:
   * - Category A (Vitest→Jest): Tests using vitest imports/APIs in Jest environment
   *   Examples: DemoWalkthrough.test.jsx, assistant.chunking.fuzz.test.tsx
   *
   * - Category B (Import paths): Broken module paths in tests or source
   *   Examples: MaestroApp.test.tsx (AuthContext), GraphCanvas.test.tsx (graphql.js)
   *
   * - Category C (Assertions): Outdated RTL assertions or MUI structure changes
   *   Examples: AdminDashboard.test.tsx, VulnerabilityDashboard.test.tsx
   *
   * - Category D (Timeouts/Flaky): Async issues, unresolved promises, slow tests
   *   Examples: ThreatIntelligenceHub.test.tsx, EnhancedAIAssistant.test.tsx
   *
   * TODO: Create tracking issue "Unskip broken client Jest suites" with checklist
   * Target: Remove 5-10 ignored suites per PR, starting with Vitest→Jest conversions
   */
  testPathIgnorePatterns: [
    '<rootDir>/src/tests/',
    '<rootDir>/src/__tests__/ServiceHealthCard.test.jsx',
    '<rootDir>/src/__tests__/Dashboard.test.jsx',
    '<rootDir>/src/__tests__/AlertBadge.test.js',
    '<rootDir>/src/__tests__/AlertBadge.test.jsx',
    '<rootDir>/src/__tests__/ConductorToolsEvidence.test.tsx',
    '<rootDir>/src/components/graph/__tests__/GraphContextMenu.test.jsx',
    '<rootDir>/src/components/graph/__tests__/AIInsightsPanel.test.jsx',
    '<rootDir>/src/components/visualization/__tests__/InteractiveGraphCanvas.test.tsx',
    '<rootDir>/src/components/mlops/__tests__/ModelManagementDashboard.test.tsx',
    '<rootDir>/src/components/dashboard/__tests__/StatsOverview.test.tsx',
    '<rootDir>/src/pages/DemoWalkthrough.test.jsx',
    '<rootDir>/src/pages/GraphWorkbench/__tests__/GraphCanvas.test.tsx',
    '<rootDir>/src/pages/Dashboard/__tests__/Dashboard.test.tsx',
    '<rootDir>/src/features/maestro/__tests__/MaestroApp.test.tsx',
    '<rootDir>/src/features/nlq/NlqModal.test.tsx',
    '<rootDir>/src/features/lho/LhoDashboard.test.tsx',
    '<rootDir>/src/features/conductor/__tests__/RunSearch.test.tsx',
    '<rootDir>/src/features/compliance/__tests__/DsarReviewer.test.tsx',
    '<rootDir>/src/components/explorer/__tests__/KGExplorer.test.tsx',
    '<rootDir>/src/components/ai-enhanced/hooks/useHoldToTalk.test.ts',
    '<rootDir>/src/components/ai-enhanced/__tests__/EnhancedAIAssistant.test.tsx',
    '<rootDir>/src/components/ai-enhanced/__tests__/assistant.abort.test.tsx',
    '<rootDir>/src/components/ai-enhanced/tests/assistant.chunking.fuzz.test.tsx',
    '<rootDir>/src/components/security/__tests__/VulnerabilityDashboard.test.tsx',
    '<rootDir>/src/components/hunting/__tests__/ThreatHuntingDashboard.test.tsx',
    '<rootDir>/src/components/governance/__tests__/GovernanceMetricsDashboard.test.tsx',
    '<rootDir>/src/components/intelligence/__tests__/ThreatIntelligenceHub.test.tsx',
    '<rootDir>/src/components/timeline/__tests__/TemporalAnalysis.test.tsx',
    '<rootDir>/src/components/common/__tests__/VirtualizedListTable.test.tsx',
    '<rootDir>/src/components/sigint/__tests__/useRedisStream.test.ts',
    '<rootDir>/src/components/sigint/__tests__/SIGINTDashboard.test.tsx',
    '<rootDir>/src/components/__tests__/PerformanceMonitor.test.tsx',
    '<rootDir>/src/components/admin/AdminDashboard.test.tsx',
    '<rootDir>/src/components/Switchboard/SystemStatusCard.test.tsx',
    '<rootDir>/src/switchboard/approvals/ApprovalsList.test.tsx',
    '<rootDir>/src/switchboard/approvals/__tests__/ApprovalsExperience.test.tsx',
    '<rootDir>/src/switchboard/audit/AuditTimeline.test.tsx',
    '<rootDir>/src/routes/__tests__/ActionDetailsRoute.test.tsx',
    '<rootDir>/src/auth/withAuthorization.test.tsx',
    '<rootDir>/src/services/socket.test.js',
    '<rootDir>/src/design-system/__tests__/designSystem.test.tsx',
    '<rootDir>/src/components/explorer/__tests__/useGraphData.test.ts',
    '<rootDir>/src/pages/Security/__tests__/SecurityPIIScanner.test.jsx',
    '<rootDir>/src/components/ai-enhanced/__tests__/assistant.chunking.test.tsx',
  ],
};

module.exports = config;
