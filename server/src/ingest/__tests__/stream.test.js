"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const stream_js_1 = require("../stream.js");
const postgres_js_1 = require("../../db/postgres.js");
const contracts_js_1 = require("../../policy/contracts.js");
const kafkajs_1 = require("kafkajs");
// Define mocks as module vars for access in jest.mock
const mockConsumer = {
    connect: globals_1.jest.fn(),
    subscribe: globals_1.jest.fn(),
    run: globals_1.jest.fn(),
    disconnect: globals_1.jest.fn(),
    commitOffsets: globals_1.jest.fn(),
};
const mockProducer = {
    connect: globals_1.jest.fn(),
    send: globals_1.jest.fn(),
    disconnect: globals_1.jest.fn(),
};
const mockAdmin = {
    connect: globals_1.jest.fn(),
    fetchOffsets: globals_1.jest.fn(),
    fetchTopicOffsets: globals_1.jest.fn(),
    disconnect: globals_1.jest.fn(),
};
// Mocks
globals_1.jest.mock('../../db/postgres', () => ({
    getPostgresPool: globals_1.jest.fn(),
}));
globals_1.jest.mock('../../policy/contracts', () => ({
    applyContract: globals_1.jest.fn(),
}));
// Use factory that returns the hoisted vars
globals_1.jest.mock('kafkajs', () => {
    return {
        Kafka: globals_1.jest.fn().mockImplementation(() => ({
            consumer: globals_1.jest.fn().mockReturnValue({
                connect: globals_1.jest.fn(),
                subscribe: globals_1.jest.fn(),
                run: globals_1.jest.fn(),
                disconnect: globals_1.jest.fn(),
                commitOffsets: globals_1.jest.fn(),
            }),
            producer: globals_1.jest.fn().mockReturnValue({
                connect: globals_1.jest.fn(),
                send: globals_1.jest.fn(),
                disconnect: globals_1.jest.fn(),
            }),
            admin: globals_1.jest.fn().mockReturnValue({
                connect: globals_1.jest.fn(),
                fetchOffsets: globals_1.jest.fn(),
                fetchTopicOffsets: globals_1.jest.fn(),
                disconnect: globals_1.jest.fn(),
            }),
        })),
    };
});
(0, globals_1.describe)('StreamingIngestService', () => {
    let service;
    let mockPool;
    let capturedConsumer;
    let capturedProducer;
    let originalMemoryUsage;
    let capturedAdmin;
    (0, globals_1.beforeEach)(() => {
        globals_1.jest.clearAllMocks();
        mockPool = {
            query: globals_1.jest.fn(),
        };
        postgres_js_1.getPostgresPool.mockReturnValue(mockPool);
        // Mock process.memoryUsage
        originalMemoryUsage = process.memoryUsage;
        process.memoryUsage = globals_1.jest.fn().mockReturnValue({
            heapUsed: 100,
            heapTotal: 1000,
            rss: 2000,
            external: 0,
            arrayBuffers: 0
        });
        // Update mock implementation to capture the inner mocks for verification
        capturedConsumer = {
            connect: globals_1.jest.fn(),
            subscribe: globals_1.jest.fn(),
            run: globals_1.jest.fn(),
            disconnect: globals_1.jest.fn(),
            commitOffsets: globals_1.jest.fn(),
            resume: globals_1.jest.fn(),
        };
        capturedProducer = {
            connect: globals_1.jest.fn(),
            send: globals_1.jest.fn(),
            disconnect: globals_1.jest.fn(),
        };
        capturedAdmin = {
            connect: globals_1.jest.fn(),
            fetchOffsets: globals_1.jest.fn(),
            fetchTopicOffsets: globals_1.jest.fn(),
            disconnect: globals_1.jest.fn(),
        };
        kafkajs_1.Kafka.mockImplementation(() => ({
            consumer: globals_1.jest.fn().mockReturnValue(capturedConsumer),
            producer: globals_1.jest.fn().mockReturnValue(capturedProducer),
            admin: globals_1.jest.fn().mockReturnValue(capturedAdmin),
        }));
        service = new stream_js_1.StreamingIngestService();
    });
    (0, globals_1.afterEach)(() => {
        process.memoryUsage = originalMemoryUsage;
    });
    (0, globals_1.it)('should start consumer', async () => {
        await service.start(['test-topic']);
        (0, globals_1.expect)(capturedConsumer.connect).toHaveBeenCalled();
        (0, globals_1.expect)(capturedConsumer.subscribe).toHaveBeenCalledWith({ topics: ['test-topic'], fromBeginning: false });
        (0, globals_1.expect)(capturedConsumer.run).toHaveBeenCalled();
    });
    (0, globals_1.it)('should process valid message', async () => {
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
            heartbeat: globals_1.jest.fn(),
            pause: globals_1.jest.fn()
        };
        await eachMessage(payload);
        (0, globals_1.expect)(contracts_js_1.applyContract).toHaveBeenCalled();
        (0, globals_1.expect)(mockPool.query).toHaveBeenCalledWith(globals_1.expect.stringContaining('INSERT INTO ingest_events'), globals_1.expect.arrayContaining(['k1', 't1', 'user-clickstream-v1']));
        (0, globals_1.expect)(capturedConsumer.commitOffsets).toHaveBeenCalled();
    });
    (0, globals_1.it)('should send to DLQ on error', async () => {
        await service.start(['test-topic']);
        const runCalls = capturedConsumer.run.mock.calls[0][0];
        const eachMessage = runCalls.eachMessage;
        // Mock applyContract to throw
        contracts_js_1.applyContract.mockImplementation(() => { throw new Error('Schema Violation'); });
        const payload = {
            topic: 'test-topic',
            partition: 0,
            message: {
                offset: '0',
                key: 'k1',
                value: Buffer.from(JSON.stringify({ schemaId: 'bad', data: {} }))
            },
            heartbeat: globals_1.jest.fn(),
            pause: globals_1.jest.fn()
        };
        await eachMessage(payload);
        (0, globals_1.expect)(capturedProducer.connect).toHaveBeenCalled();
        (0, globals_1.expect)(capturedProducer.send).toHaveBeenCalledWith(globals_1.expect.objectContaining({
            topic: 'test-topic-dlq',
            messages: globals_1.expect.arrayContaining([
                globals_1.expect.objectContaining({
                    key: 'k1',
                    value: globals_1.expect.stringContaining('Schema Violation')
                })
            ])
        }));
        // Should still commit offset to move forward
        (0, globals_1.expect)(capturedConsumer.commitOffsets).toHaveBeenCalled();
    });
});
