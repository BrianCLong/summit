
import baseConfig from './jest.config.js';

/**
 * Jest Configuration for Quarantine (Flaky Tests)
 * 
 * This runs ONLY files ending in .flaky.test.ts
 */
export default {
    ...baseConfig,
    testMatch: [
        '<rootDir>/tests/**/*.flaky.test.ts',
        '<rootDir>/src/**/*.flaky.test.ts',
    ],
    // Clear the ignore patterns so we DON'T ignore the flaky tests
    testPathIgnorePatterns: [
        '/node_modules/',
        '/dist/',
        '/coverage/',
    ],
    reporters: [
        'default',
        ['jest-junit', { outputDirectory: 'evidence/quarantine', outputName: 'flaky-tests.xml' }]
    ],
};
