
import config from './jest.config';
import type { Config } from 'jest';

const e2eConfig: Config = {
    ...config,
    moduleNameMapper: {
        ...config.moduleNameMapper,
        // Remove global mocks for critical services so E2E tests use real implementations
        // We override them with regex that won't match, essentially disabling them
        '.*middleware/auth(\\.js)?$': '$1',
        '.*ingestion/QueueService(\\.js)?$': '$1',
    },
    testMatch: [
        '<rootDir>/tests/**/*.test.ts',
    ],
    testPathIgnorePatterns: [
        '/node_modules/',
        '/dist/',
    ],
    setupFilesAfterEnv: [
        '<rootDir>/tests/setup/jest.setup.cjs',
        'jest-extended/all'
    ],
    // E2E tests might need longer timeout
    testTimeout: 60000,
};

export default e2eConfig;
