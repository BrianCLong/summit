import config from './jest.config';

const integrationConfig = {
  ...config,
  testMatch: [
    '<rootDir>/tests/**/*.integration.test.ts',
    '<rootDir>/src/**/__tests__/**/*.integration.test.ts',
    '<rootDir>/server/src/db/__tests__/pgTenantRouting.integration.test.ts' // Add other patterns if needed
  ],
  testPathIgnorePatterns: [
     '/node_modules/',
     '/dist/',
  ],
  moduleNameMapper: {
    ...config.moduleNameMapper,
  },
};

// Remove mocks for real integration tests
// We want to use the REAL drivers which are instrumented/configured in src/
delete integrationConfig.moduleNameMapper['^pg$'];
delete integrationConfig.moduleNameMapper['^ioredis$'];
delete integrationConfig.moduleNameMapper['^neo4j-driver$'];
delete integrationConfig.moduleNameMapper['.*db/neo4j(\\.js)?$'];
delete integrationConfig.moduleNameMapper['.*db/redis(\\.js)?$'];

// Ensure setup files don't mock them again
// jest.setup.cjs mocks pg globally. We need an integration setup file that doesn't.
integrationConfig.setupFilesAfterEnv = [
  '<rootDir>/tests/setup/jest.integration.setup.cjs',
  'jest-extended/all',
];

export default integrationConfig;
