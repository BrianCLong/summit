import type { Config } from 'jest';
import baseConfig from './jest.config.ts';

// Filter out DB mocks from moduleNameMapper
const moduleNameMapper = Object.fromEntries(
  Object.entries(baseConfig.moduleNameMapper || {}).filter(([key, value]) => {
    // Remove mocks for DB drivers to allow real connections
    if (key === '^pg$' || key === '^pg-boss$') return false;
    if (key === '^ioredis$') return false;
    if (key === '^neo4j-driver$') return false;
    if (key.includes('db/neo4j')) return false;
    if (key.includes('db/redis')) return false;
    // Also keep other mocks but ensure we don't mock essential services for integration
    return true;
  })
);

const config: Config = {
  ...baseConfig,
  testMatch: ['**/*.integration.test.ts', '**/*.int.test.ts'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup/jest.integration.setup.cjs'],
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
  moduleNameMapper,
  // Increase timeout for integration tests
  testTimeout: 60000,
};

export default config;
