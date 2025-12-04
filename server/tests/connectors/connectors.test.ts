
import { GCSConnector } from '../../src/connectors/gcs.js';
import { JDBCConnector } from '../../src/connectors/jdbc.js';
import { Readable } from 'stream';
import { jest } from '@jest/globals';

// Mock dependencies
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
                    exists: jest.fn().mockResolvedValue([true]),
                    download: jest.fn().mockResolvedValue([Buffer.from('test data')])
                })
            })
        }))
    };
});

jest.mock('pg', () => {
    return {
        Pool: jest.fn().mockImplementation(() => ({
            connect: jest.fn().mockResolvedValue({
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

describe('Connectors (Smoke Test)', () => {
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
