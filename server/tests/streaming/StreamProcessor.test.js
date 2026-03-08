"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const AggregationProcessor_js_1 = require("../../src/streaming/processing/AggregationProcessor.js");
const KafkaConsumer_js_1 = require("../../src/streaming/KafkaConsumer.js");
const KafkaProducer_js_1 = require("../../src/streaming/KafkaProducer.js");
// Mocks
globals_1.jest.mock('../../src/streaming/KafkaConsumer.js');
globals_1.jest.mock('../../src/streaming/KafkaProducer.js');
(0, globals_1.describe)('AggregationProcessor', () => {
    let processor;
    let mockConsumer;
    let mockProducer;
    (0, globals_1.beforeEach)(() => {
        mockConsumer = new KafkaConsumer_js_1.KafkaConsumerWrapper({});
        mockProducer = new KafkaProducer_js_1.KafkaProducerWrapper({});
        mockConsumer.run = globals_1.jest.fn();
        mockProducer.send = globals_1.jest.fn();
        mockConsumer.disconnect = globals_1.jest.fn();
        mockProducer.disconnect = globals_1.jest.fn();
        processor = new AggregationProcessor_js_1.AggregationProcessor(mockConsumer, mockProducer, 'input-topic', 'output-topic', 'test-processor');
    });
    (0, globals_1.it)('should start and run consumer', async () => {
        await processor.start();
        (0, globals_1.expect)(mockConsumer.run).toHaveBeenCalled();
    });
    (0, globals_1.it)('should process and aggregate messages', async () => {
        // Get the handler passed to run
        let handler;
        mockConsumer.run.mockImplementation(async (opts) => {
            handler = opts;
        });
        await processor.start();
        // Check if handler was captured.
        // Note: mockImplementation runs when start() calls run().
        // So handler should be set.
        // However, if TS complains about variable use before assignment in the closure (it won't here), we are good.
        // Simulate 5 messages for same entity
        const entityId = 'entity-1';
        for (let i = 0; i < 5; i++) {
            // @ts-ignore
            if (handler)
                await handler({ subject: entityId, data: { val: i } });
        }
        // After 5th message, it should emit
        (0, globals_1.expect)(mockProducer.send).toHaveBeenCalledTimes(1);
        (0, globals_1.expect)(mockProducer.send).toHaveBeenCalledWith('output-topic', globals_1.expect.arrayContaining([
            globals_1.expect.objectContaining({
                type: 'AGGREGATION_UPDATE',
                entityId: 'entity-1',
                count: 5,
            })
        ]));
    });
});
