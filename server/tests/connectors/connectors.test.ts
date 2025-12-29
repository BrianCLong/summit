// Mock config before any imports to prevent process.exit
jest.mock('../../src/config.js', () => ({
  cfg: {
    NODE_ENV: 'test',
    DATABASE_URL: 'postgres://test:test@localhost:5432/test',
    NEO4J_URI: 'bolt://localhost:7687',
    NEO4J_USER: 'neo4j',
    NEO4J_PASSWORD: 'test',
    REDIS_URL: 'redis://localhost:6379',
    JWT_SECRET: 'test-secret',
    JWT_ISSUER: 'test',
  },
}));

import { GCSConnector } from '../../src/connectors/gcs.js';
import { Readable } from 'stream';
import { jest } from '@jest/globals';

// Mock JDBCConnector since mysql2 is not installed
jest.mock('../../src/connectors/jdbc.js', () => ({
    JDBCConnector: jest.fn().mockImplementation(() => ({
        connect: jest.fn(),
        healthCheck: (jest.fn() as any).mockResolvedValue({ healthy: true }),
        query: (jest.fn() as any).mockResolvedValue([]),
        close: jest.fn()
    }))
}));

import { JDBCConnector } from '../../src/connectors/jdbc.js';

// Mock dependencies - use type casting to avoid TypeScript inference issues
jest.mock('@google-cloud/storage', () => {
    return {
        Storage: jest.fn().mockImplementation(() => ({
            bucket: jest.fn().mockReturnValue({
                file: jest.fn().mockReturnValue({
                    createReadStream: jest.fn().mockReturnValue(new Readable({
                        read() {
                            this.push('test data');
                            this.push(null);
                        }
                    })),
                    exists: (jest.fn() as any).mockResolvedValue([true]),
                    download: (jest.fn() as any).mockResolvedValue([Buffer.from('test data')])
                })
            })
        }))
    };
});

jest.mock('pg', () => {
    return {
        Pool: jest.fn().mockImplementation(() => ({
            connect: (jest.fn() as any).mockResolvedValue({
                query: jest.fn(),
                release: jest.fn()
            }),
            end: jest.fn()
        })),
        types: {
            setTypeParser: jest.fn()
        }
    };
});

// TODO: These tests require complex mocking of dynamic require'd modules.
// Skip until we implement proper module mocking infrastructure.
describe.skip('Connectors (Smoke Test)', () => {
    describe('GCSConnector', () => {
        let gcs: GCSConnector;

        beforeEach(() => {
            gcs = new GCSConnector('test-tenant', {
                projectId: 'test',
                bucketName: 'test-bucket'
            });
        });

        it('should initialize', () => {
            expect(gcs).toBeDefined();
        });

        it('should support downloadStream', async () => {
            const stream = await gcs.downloadStream('test-obj');
            expect(stream).toBeInstanceOf(Readable);
        });
    });

    describe('JDBCConnector', () => {
        let jdbc: JDBCConnector;

        beforeEach(() => {
            jdbc = new JDBCConnector('test-tenant', {
                type: 'postgresql',
                host: 'localhost',
                port: 5432,
                database: 'test',
                username: 'test',
                password: 'test'
            });
        });

        it('should initialize', () => {
            expect(jdbc).toBeDefined();
        });

        // Skip deeper logic tests that require complex mocking of pg-cursor/streams
        // relying on type checks and basic instantiation
    });
});
