"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// Mock config before any imports to prevent process.exit
globals_1.jest.mock('../../src/config.js', () => ({
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
const gcs_js_1 = require("../../src/connectors/gcs.js");
const stream_1 = require("stream");
const globals_1 = require("@jest/globals");
// Mock JDBCConnector since mysql2 is not installed
globals_1.jest.mock('../../src/connectors/jdbc.js', () => ({
    JDBCConnector: globals_1.jest.fn().mockImplementation(() => ({
        connect: globals_1.jest.fn(),
        healthCheck: globals_1.jest.fn().mockResolvedValue({ healthy: true }),
        query: globals_1.jest.fn().mockResolvedValue([]),
        close: globals_1.jest.fn()
    }))
}));
const jdbc_js_1 = require("../../src/connectors/jdbc.js");
// Mock dependencies - use type casting to avoid TypeScript inference issues
globals_1.jest.mock('@google-cloud/storage', () => {
    return {
        Storage: globals_1.jest.fn().mockImplementation(() => ({
            bucket: globals_1.jest.fn().mockReturnValue({
                file: globals_1.jest.fn().mockReturnValue({
                    createReadStream: globals_1.jest.fn().mockReturnValue(new stream_1.Readable({
                        read() {
                            this.push('test data');
                            this.push(null);
                        }
                    })),
                    exists: globals_1.jest.fn().mockResolvedValue([true]),
                    download: globals_1.jest.fn().mockResolvedValue([Buffer.from('test data')])
                })
            })
        }))
    };
});
globals_1.jest.mock('pg', () => {
    return {
        Pool: globals_1.jest.fn().mockImplementation(() => ({
            connect: globals_1.jest.fn().mockResolvedValue({
                query: globals_1.jest.fn(),
                release: globals_1.jest.fn()
            }),
            end: globals_1.jest.fn()
        })),
        types: {
            setTypeParser: globals_1.jest.fn()
        }
    };
});
// TODO: These tests require complex mocking of dynamic require'd modules.
// Skip until we implement proper module mocking infrastructure.
describe.skip('Connectors (Smoke Test)', () => {
    describe('GCSConnector', () => {
        let gcs;
        beforeEach(() => {
            gcs = new gcs_js_1.GCSConnector('test-tenant', {
                projectId: 'test',
                bucketName: 'test-bucket'
            });
        });
        it('should initialize', () => {
            expect(gcs).toBeDefined();
        });
        it('should support downloadStream', async () => {
            const stream = await gcs.downloadStream('test-obj');
            expect(stream).toBeInstanceOf(stream_1.Readable);
        });
    });
    describe('JDBCConnector', () => {
        let jdbc;
        beforeEach(() => {
            jdbc = new jdbc_js_1.JDBCConnector('test-tenant', {
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
