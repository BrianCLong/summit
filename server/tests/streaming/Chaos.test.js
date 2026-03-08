"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const AggregationProcessor_js_1 = require("../../src/streaming/processing/AggregationProcessor.js");
const KafkaConsumer_js_1 = require("../../src/streaming/KafkaConsumer.js");
const KafkaProducer_js_1 = require("../../src/streaming/KafkaProducer.js");
globals_1.jest.mock('../../src/streaming/KafkaConsumer.js');
globals_1.jest.mock('../../src/streaming/KafkaProducer.js');
(0, globals_1.describe)('Chaos Resilience', () => {
    let processor;
    let mockConsumer;
    let mockProducer;
    let mockStateStore;
    (0, globals_1.beforeEach)(() => {
        mockConsumer = new KafkaConsumer_js_1.KafkaConsumerWrapper({});
        mockProducer = new KafkaProducer_js_1.KafkaProducerWrapper({});
        mockStateStore = {
            get: globals_1.jest.fn(),
            set: globals_1.jest.fn(),
            increment: globals_1.jest.fn(),
        };
        mockConsumer.run = globals_1.jest.fn();
        mockProducer.send = globals_1.jest.fn();
        mockConsumer.disconnect = globals_1.jest.fn();
        mockProducer.disconnect = globals_1.jest.fn();
        processor = new AggregationProcessor_js_1.AggregationProcessor(mockConsumer, mockProducer, 'input', 'output', 'chaos-test', mockStateStore);
    });
    (0, globals_1.it)('should propagate state store errors to consumer', async () => {
        // If Redis fails, processor should throw so Consumer can retry/DLQ
        mockStateStore.increment.mockRejectedValue(new Error('Redis Connection Lost'));
        let handler;
        mockConsumer.run.mockImplementation(async (opts) => {
            // If opts has partition config, handler is in eachMessage
            if (opts.eachMessage)
                handler = opts.eachMessage;
            else
                handler = opts;
        });
        await processor.start();
        // Simulate message
        const msg = { subject: 'e1', data: { val: 1 } };
        // Expect the handler to throw the Redis error
        // @ts-ignore
        await (0, globals_1.expect)(handler(msg)).rejects.toThrow('Redis Connection Lost');
    });
});
