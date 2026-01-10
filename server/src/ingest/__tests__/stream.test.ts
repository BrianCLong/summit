
import { jest, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import { StreamingIngestService } from '../stream';
import { getPostgresPool } from '../../db/postgres';
import { applyContract } from '../../policy/contracts';
import { Kafka } from 'kafkajs';

// Define mocks as module vars for access in jest.mock
const mockConsumer = {
    connect: jest.fn(),
    subscribe: jest.fn(),
    run: jest.fn(),
    disconnect: jest.fn(),
    commitOffsets: jest.fn(),
};

const mockProducer = {
    connect: jest.fn(),
    send: jest.fn(),
    disconnect: jest.fn(),
};

const mockAdmin = {
    connect: jest.fn(),
    fetchOffsets: jest.fn(),
    fetchTopicOffsets: jest.fn(),
    disconnect: jest.fn(),
};

// Mocks
jest.mock('../../db/postgres', () => ({
  getPostgresPool: jest.fn(),
}));

jest.mock('../../policy/contracts', () => ({
  applyContract: jest.fn(),
}));

// Use factory that returns the hoisted vars
jest.mock('kafkajs', () => {
    return {
        Kafka: jest.fn().mockImplementation(() => ({
            consumer: jest.fn().mockReturnValue({
                connect: jest.fn(),
                subscribe: jest.fn(),
                run: jest.fn(),
                disconnect: jest.fn(),
                commitOffsets: jest.fn(),
            }),
            producer: jest.fn().mockReturnValue({
                connect: jest.fn(),
                send: jest.fn(),
                disconnect: jest.fn(),
            }),
            admin: jest.fn().mockReturnValue({
                connect: jest.fn(),
                fetchOffsets: jest.fn(),
                fetchTopicOffsets: jest.fn(),
                disconnect: jest.fn(),
            }),
        })),
    };
});

describe('StreamingIngestService', () => {
    let service: StreamingIngestService;
    let mockPool: any;
    let capturedConsumer: any;
    let capturedProducer: any;
    let originalMemoryUsage: any;

    let capturedAdmin: any;

    beforeEach(() => {
        jest.clearAllMocks();
        mockPool = {
            query: jest.fn(),
        };
        (getPostgresPool as jest.Mock).mockReturnValue(mockPool);

        // Mock process.memoryUsage
        originalMemoryUsage = process.memoryUsage;
        process.memoryUsage = jest.fn().mockReturnValue({
            heapUsed: 100,
            heapTotal: 1000,
            rss: 2000,
            external: 0,
            arrayBuffers: 0
        }) as any;

        // Update mock implementation to capture the inner mocks for verification
        capturedConsumer = {
            connect: jest.fn(),
            subscribe: jest.fn(),
            run: jest.fn(),
            disconnect: jest.fn(),
            commitOffsets: jest.fn(),
            resume: jest.fn(),
        };
        capturedProducer = {
            connect: jest.fn(),
            send: jest.fn(),
            disconnect: jest.fn(),
        };
        capturedAdmin = {
            connect: jest.fn(),
            fetchOffsets: jest.fn(),
            fetchTopicOffsets: jest.fn(),
            disconnect: jest.fn(),
        };

        (Kafka as unknown as jest.Mock).mockImplementation(() => ({
            consumer: jest.fn().mockReturnValue(capturedConsumer),
            producer: jest.fn().mockReturnValue(capturedProducer),
            admin: jest.fn().mockReturnValue(capturedAdmin),
        }));

        service = new StreamingIngestService();
    });

    afterEach(() => {
        process.memoryUsage = originalMemoryUsage;
    });

    it('should start consumer', async () => {
        await service.start(['test-topic']);
        expect(capturedConsumer.connect).toHaveBeenCalled();
        expect(capturedConsumer.subscribe).toHaveBeenCalledWith({ topics: ['test-topic'], fromBeginning: false });
        expect(capturedConsumer.run).toHaveBeenCalled();
    });

    it('should process valid message', async () => {
        // Access the eachMessage callback passed to run
        await service.start(['test-topic']);
        const runCalls = capturedConsumer.run.mock.calls[0][0];
        const eachMessage = runCalls.eachMessage;

        const payload = {
            topic: 'test-topic',
            partition: 0,
            message: {
                offset: '0',
                value: Buffer.from(JSON.stringify({
                    schemaId: 'user-clickstream-v1',
                    data: { userId: 'u1', url: 'http://e.com', timestamp: new Date().toISOString() },
                    tenantId: 't1',
                    idempotentKey: 'k1'
                }))
            },
            heartbeat: jest.fn(),
            pause: jest.fn()
        };

        await eachMessage(payload);

        expect(applyContract).toHaveBeenCalled();
        expect(mockPool.query).toHaveBeenCalledWith(
            expect.stringContaining('INSERT INTO ingest_events'),
            expect.arrayContaining(['k1', 't1', 'user-clickstream-v1'])
        );
        expect(capturedConsumer.commitOffsets).toHaveBeenCalled();
    });

    it('should send to DLQ on error', async () => {
        await service.start(['test-topic']);
        const runCalls = capturedConsumer.run.mock.calls[0][0];
        const eachMessage = runCalls.eachMessage;

        // Mock applyContract to throw
        (applyContract as jest.Mock).mockImplementation(() => { throw new Error('Schema Violation'); });

        const payload = {
            topic: 'test-topic',
            partition: 0,
            message: {
                offset: '0',
                key: 'k1',
                value: Buffer.from(JSON.stringify({ schemaId: 'bad', data: {} }))
            },
            heartbeat: jest.fn(),
            pause: jest.fn()
        };

        await eachMessage(payload);

        expect(capturedProducer.connect).toHaveBeenCalled();
        expect(capturedProducer.send).toHaveBeenCalledWith(expect.objectContaining({
            topic: 'test-topic-dlq',
            messages: expect.arrayContaining([
                expect.objectContaining({
                    key: 'k1',
                    value: expect.stringContaining('Schema Violation')
                })
            ])
        }));
        // Should still commit offset to move forward
        expect(capturedConsumer.commitOffsets).toHaveBeenCalled();
    });
});
