"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const KafkaConsumer_js_1 = require("../../src/streaming/KafkaConsumer.js");
const KafkaProducer_js_1 = require("../../src/streaming/KafkaProducer.js");
const kafkajs_1 = require("kafkajs");
globals_1.jest.mock('kafkajs');
globals_1.jest.mock('../../src/streaming/KafkaProducer.js');
(0, globals_1.describe)('KafkaConsumerWrapper', () => {
    let consumerWrapper;
    let mockConsumer;
    let mockDlqProducer;
    (0, globals_1.beforeEach)(() => {
        globals_1.jest.clearAllMocks();
        mockConsumer = {
            connect: globals_1.jest.fn().mockResolvedValue(undefined),
            disconnect: globals_1.jest.fn().mockResolvedValue(undefined),
            subscribe: globals_1.jest.fn().mockResolvedValue(undefined),
            run: globals_1.jest.fn().mockResolvedValue(undefined),
        };
        kafkajs_1.Kafka.mockImplementation(() => ({
            consumer: globals_1.jest.fn(() => mockConsumer),
        }));
        mockDlqProducer = new KafkaProducer_js_1.KafkaProducerWrapper({});
        mockDlqProducer.send = globals_1.jest.fn();
    });
    (0, globals_1.it)('should throw error if handler fails and no DLQ configured', async () => {
        consumerWrapper = new KafkaConsumer_js_1.KafkaConsumerWrapper({
            clientId: 'test',
            brokers: ['localhost:9092'],
            groupId: 'group1'
        });
        const userHandler = globals_1.jest.fn().mockRejectedValue(new Error('Processing failed'));
        // Cast to any to bypass strict checks if needed, or rely on correct generic
        await consumerWrapper.run(userHandler);
        const runCall = mockConsumer.run.mock.calls[0][0];
        const eachMessage = runCall.eachMessage;
        await (0, globals_1.expect)(eachMessage({
            topic: 'test-topic',
            partition: 0,
            message: { value: Buffer.from(JSON.stringify({ foo: 'bar' })) }
        })).rejects.toThrow('Processing failed');
    });
    (0, globals_1.it)('should send to DLQ if handler fails and DLQ configured', async () => {
        consumerWrapper = new KafkaConsumer_js_1.KafkaConsumerWrapper({
            clientId: 'test',
            brokers: ['localhost:9092'],
            groupId: 'group1',
            dlqProducer: mockDlqProducer,
            dlqTopic: 'dlq-topic'
        });
        const userHandler = globals_1.jest.fn().mockRejectedValue(new Error('Processing failed'));
        await consumerWrapper.run(userHandler);
        const runCall = mockConsumer.run.mock.calls[0][0];
        const eachMessage = runCall.eachMessage;
        await (0, globals_1.expect)(eachMessage({
            topic: 'test-topic',
            partition: 0,
            message: { value: Buffer.from(JSON.stringify({ foo: 'bar' })) }
        })).resolves.not.toThrow();
        (0, globals_1.expect)(mockDlqProducer.send).toHaveBeenCalledWith('dlq-topic', globals_1.expect.any(Array));
    });
});
