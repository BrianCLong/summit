import baseConfig from './jest.config.js';

const reporters = baseConfig.reporters ? [...baseConfig.reporters] : ['default'];
reporters.push(['jest-junit', { outputDirectory: 'evidence/integration', outputName: 'integration-tests.xml' }]);

export default {
  ...baseConfig,
  testMatch: [
    '<rootDir>/tests/integration/**/*.test.ts',
    '<rootDir>/tests/**/*.@(int|integration).test.ts',
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/coverage/',
  ],
  reporters,
};
