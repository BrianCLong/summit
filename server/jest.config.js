/**
 * Jest Configuration for IntelGraph Server
 * Comprehensive testing setup with coverage, integration, and performance testing
 */

export default {
  // Test environment
  testEnvironment: "node",

  // Setup files
  setupFilesAfterEnv: [
    "<rootDir>/tests/setup/jest.setup.js",
    "jest-extended/all",
  ],

  // Test matching patterns
  testMatch: [
    "<rootDir>/tests/**/*.test.ts",
    "<rootDir>/src/tests/**/*.test.ts",
    "<rootDir>/src/**/__tests__/**/*.test.ts",
  ],

  // Ignore patterns
  testPathIgnorePatterns: [
    "/node_modules/",
    "/dist/",
    "/build/",
    "/coverage/",
    "/playwright-tests/",
  ],

  // Module paths and aliases
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    "^@tests/(.*)$": "<rootDir>/tests/$1",
  },
  transform: {
    '^.+\.tsx?

  // Coverage configuration
  collectCoverageFrom: [
    "src/**/*.ts",
    "!src/**/__tests__/**",
    "!src/**/*.test.ts",
    "!src/**/*.spec.ts",
    "!src/tests/**",
    "!src/**/index.ts",
    "!src/config/**",
    "!src/database/**",
  ],

  // Coverage thresholds (≥80% as per requirements)
  coverageThreshold: {
    global: {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85,
    },
  },

  // Coverage reporters
  coverageReporters: ["text", "lcov", "html", "json-summary"],

  // Coverage directory
  coverageDirectory: "<rootDir>/coverage",

  // Test timeout (increased for integration tests)
  testTimeout: 30000,

  // Global test setup
  globalSetup: "<rootDir>/tests/setup/globalSetup.js",
  globalTeardown: "<rootDir>/tests/setup/globalTeardown.js",

  // Test results processor
  testResultsProcessor: "jest-junit",

  // Verbose output
  verbose: true,

  // Clear mocks between tests
  clearMocks: true,
  restoreMocks: true,
  resetMocks: true,

  // Error handling
  bail: false,
  errorOnDeprecated: true,

  // Transform ignore patterns
  transformIgnorePatterns: ["node_modules/(?!(.*\.mjs$))"],

  // Max workers for parallel testing
  maxWorkers: process.env.CI ? 2 : "50%",

  // JUnit reporter configuration
  reporters: [
    "default",
    [
      "jest-junit",
      {
        outputDirectory: "<rootDir>/test-results",
        outputName: "junit.xml",
        classNameTemplate: "{classname}",
        titleTemplate: "{title}",
        ancestorSeparator: " › ",
        usePathForSuiteName: true,
      },
    ],
  ],
};
: [
      'ts-jest',
      {
        tsconfig: {
          module: 'esnext',
          target: 'es2020',
        },
      },
    ],
    '^.+\.jsx?

  // Coverage configuration
  collectCoverageFrom: [
    "src/**/*.ts",
    "!src/**/__tests__/**",
    "!src/**/*.test.ts",
    "!src/**/*.spec.ts",
    "!src/tests/**",
    "!src/**/index.ts",
    "!src/config/**",
    "!src/database/**",
  ],

  // Coverage thresholds (≥80% as per requirements)
  coverageThreshold: {
    global: {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85,
    },
  },

  // Coverage reporters
  coverageReporters: ["text", "lcov", "html", "json-summary"],

  // Coverage directory
  coverageDirectory: "<rootDir>/coverage",

  // Test timeout (increased for integration tests)
  testTimeout: 30000,

  // Global test setup
  globalSetup: "<rootDir>/tests/setup/globalSetup.js",
  globalTeardown: "<rootDir>/tests/setup/globalTeardown.js",

  // Test results processor
  testResultsProcessor: "jest-junit",

  // Verbose output
  verbose: true,

  // Clear mocks between tests
  clearMocks: true,
  restoreMocks: true,
  resetMocks: true,

  // Error handling
  bail: false,
  errorOnDeprecated: true,

  // Transform ignore patterns
  transformIgnorePatterns: ["node_modules/(?!(.*\.mjs$))"],

  // Max workers for parallel testing
  maxWorkers: process.env.CI ? 2 : "50%",

  // JUnit reporter configuration
  reporters: [
    "default",
    [
      "jest-junit",
      {
        outputDirectory: "<rootDir>/test-results",
        outputName: "junit.xml",
        classNameTemplate: "{classname}",
        titleTemplate: "{title}",
        ancestorSeparator: " › ",
        usePathForSuiteName: true,
      },
    ],
  ],
};
: 'babel-jest',
    '^.+\.mjs

  // Coverage configuration
  collectCoverageFrom: [
    "src/**/*.ts",
    "!src/**/__tests__/**",
    "!src/**/*.test.ts",
    "!src/**/*.spec.ts",
    "!src/tests/**",
    "!src/**/index.ts",
    "!src/config/**",
    "!src/database/**",
  ],

  // Coverage thresholds (≥80% as per requirements)
  coverageThreshold: {
    global: {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85,
    },
  },

  // Coverage reporters
  coverageReporters: ["text", "lcov", "html", "json-summary"],

  // Coverage directory
  coverageDirectory: "<rootDir>/coverage",

  // Test timeout (increased for integration tests)
  testTimeout: 30000,

  // Global test setup
  globalSetup: "<rootDir>/tests/setup/globalSetup.js",
  globalTeardown: "<rootDir>/tests/setup/globalTeardown.js",

  // Test results processor
  testResultsProcessor: "jest-junit",

  // Verbose output
  verbose: true,

  // Clear mocks between tests
  clearMocks: true,
  restoreMocks: true,
  resetMocks: true,

  // Error handling
  bail: false,
  errorOnDeprecated: true,

  // Transform ignore patterns
  transformIgnorePatterns: ["node_modules/(?!(.*\.mjs$))"],

  // Max workers for parallel testing
  maxWorkers: process.env.CI ? 2 : "50%",

  // JUnit reporter configuration
  reporters: [
    "default",
    [
      "jest-junit",
      {
        outputDirectory: "<rootDir>/test-results",
        outputName: "junit.xml",
        classNameTemplate: "{classname}",
        titleTemplate: "{title}",
        ancestorSeparator: " › ",
        usePathForSuiteName: true,
      },
    ],
  ],
};
: 'babel-jest',
    '^.+\.js

  // Coverage configuration
  collectCoverageFrom: [
    "src/**/*.ts",
    "!src/**/__tests__/**",
    "!src/**/*.test.ts",
    "!src/**/*.spec.ts",
    "!src/tests/**",
    "!src/**/index.ts",
    "!src/config/**",
    "!src/database/**",
  ],

  // Coverage thresholds (≥80% as per requirements)
  coverageThreshold: {
    global: {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85,
    },
  },

  // Coverage reporters
  coverageReporters: ["text", "lcov", "html", "json-summary"],

  // Coverage directory
  coverageDirectory: "<rootDir>/coverage",

  // Test timeout (increased for integration tests)
  testTimeout: 30000,

  // Global test setup
  globalSetup: "<rootDir>/tests/setup/globalSetup.js",
  globalTeardown: "<rootDir>/tests/setup/globalTeardown.js",

  // Test results processor
  testResultsProcessor: "jest-junit",

  // Verbose output
  verbose: true,

  // Clear mocks between tests
  clearMocks: true,
  restoreMocks: true,
  resetMocks: true,

  // Error handling
  bail: false,
  errorOnDeprecated: true,

  // Transform ignore patterns
  transformIgnorePatterns: ["node_modules/(?!(.*\.mjs$))"],

  // Max workers for parallel testing
  maxWorkers: process.env.CI ? 2 : "50%",

  // JUnit reporter configuration
  reporters: [
    "default",
    [
      "jest-junit",
      {
        outputDirectory: "<rootDir>/test-results",
        outputName: "junit.xml",
        classNameTemplate: "{classname}",
        titleTemplate: "{title}",
        ancestorSeparator: " › ",
        usePathForSuiteName: true,
      },
    ],
  ],
};
: 'babel-jest',
    '^.+\.ts

  // Coverage configuration
  collectCoverageFrom: [
    "src/**/*.ts",
    "!src/**/__tests__/**",
    "!src/**/*.test.ts",
    "!src/**/*.spec.ts",
    "!src/tests/**",
    "!src/**/index.ts",
    "!src/config/**",
    "!src/database/**",
  ],

  // Coverage thresholds (≥80% as per requirements)
  coverageThreshold: {
    global: {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85,
    },
  },

  // Coverage reporters
  coverageReporters: ["text", "lcov", "html", "json-summary"],

  // Coverage directory
  coverageDirectory: "<rootDir>/coverage",

  // Test timeout (increased for integration tests)
  testTimeout: 30000,

  // Global test setup
  globalSetup: "<rootDir>/tests/setup/globalSetup.js",
  globalTeardown: "<rootDir>/tests/setup/globalTeardown.js",

  // Test results processor
  testResultsProcessor: "jest-junit",

  // Verbose output
  verbose: true,

  // Clear mocks between tests
  clearMocks: true,
  restoreMocks: true,
  resetMocks: true,

  // Error handling
  bail: false,
  errorOnDeprecated: true,

  // Transform ignore patterns
  transformIgnorePatterns: ["node_modules/(?!(.*\.mjs$))"],

  // Max workers for parallel testing
  maxWorkers: process.env.CI ? 2 : "50%",

  // JUnit reporter configuration
  reporters: [
    "default",
    [
      "jest-junit",
      {
        outputDirectory: "<rootDir>/test-results",
        outputName: "junit.xml",
        classNameTemplate: "{classname}",
        titleTemplate: "{title}",
        ancestorSeparator: " › ",
        usePathForSuiteName: true,
      },
    ],
  ],
};
: 'ts-jest',
    '../src/app.ts': [
      'ts-jest',
      {
        tsconfig: {
          module: 'esnext',
          target: 'es2020',
        },
      },
    ],
  },

  // Coverage configuration
  collectCoverageFrom: [
    "src/**/*.ts",
    "!src/**/__tests__/**",
    "!src/**/*.test.ts",
    "!src/**/*.spec.ts",
    "!src/tests/**",
    "!src/**/index.ts",
    "!src/config/**",
    "!src/database/**",
  ],

  // Coverage thresholds (≥80% as per requirements)
  coverageThreshold: {
    global: {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85,
    },
  },

  // Coverage reporters
  coverageReporters: ["text", "lcov", "html", "json-summary"],

  // Coverage directory
  coverageDirectory: "<rootDir>/coverage",

  // Test timeout (increased for integration tests)
  testTimeout: 30000,

  // Global test setup
  globalSetup: "<rootDir>/tests/setup/globalSetup.js",
  globalTeardown: "<rootDir>/tests/setup/globalTeardown.js",

  // Test results processor
  testResultsProcessor: "jest-junit",

  // Verbose output
  verbose: true,

  // Clear mocks between tests
  clearMocks: true,
  restoreMocks: true,
  resetMocks: true,

  // Error handling
  bail: false,
  errorOnDeprecated: true,

  // Transform ignore patterns
  transformIgnorePatterns: ["node_modules/(?!(.*\.mjs$))"],

  // Max workers for parallel testing
  maxWorkers: process.env.CI ? 2 : "50%",

  // JUnit reporter configuration
  reporters: [
    "default",
    [
      "jest-junit",
      {
        outputDirectory: "<rootDir>/test-results",
        outputName: "junit.xml",
        classNameTemplate: "{classname}",
        titleTemplate: "{title}",
        ancestorSeparator: " › ",
        usePathForSuiteName: true,
      },
    ],
  ],
};
