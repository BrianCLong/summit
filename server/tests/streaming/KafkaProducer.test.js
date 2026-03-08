"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const KafkaProducer_js_1 = require("../../src/streaming/KafkaProducer.js");
const SchemaRegistry_js_1 = require("../../src/streaming/SchemaRegistry.js");
const kafkajs_1 = require("kafkajs");
globals_1.jest.mock('kafkajs', () => ({
    Kafka: globals_1.jest.fn(),
}));
(0, globals_1.describe)('KafkaProducerWrapper', () => {
    let producerWrapper;
    let schemaRegistry;
    let mockProducer;
    (0, globals_1.beforeEach)(() => {
        globals_1.jest.clearAllMocks();
        mockProducer = {
            connect: globals_1.jest.fn().mockResolvedValue(undefined),
            disconnect: globals_1.jest.fn().mockResolvedValue(undefined),
            send: globals_1.jest.fn().mockResolvedValue(undefined),
        };
        kafkajs_1.Kafka.mockImplementation(() => ({
            producer: globals_1.jest.fn(() => mockProducer),
        }));
        schemaRegistry = new SchemaRegistry_js_1.MockSchemaRegistry();
        producerWrapper = new KafkaProducer_js_1.KafkaProducerWrapper({
            clientId: 'test-client',
            brokers: ['localhost:9092'],
            schemaRegistry,
        });
    });
    (0, globals_1.it)('should connect to kafka', async () => {
        await producerWrapper.connect();
        (0, globals_1.expect)(mockProducer.connect).toHaveBeenCalled();
    });
    (0, globals_1.it)('should send messages with schema encoding', async () => {
        const topic = 'test-topic';
        const message = { id: '123', data: 'test' };
        // Register schema to get an ID. MockSchemaRegistry starts at 1.
        const schemaId = await schemaRegistry.register(topic, {});
        await producerWrapper.send(topic, [message]);
        (0, globals_1.expect)(mockProducer.connect).toHaveBeenCalled();
        // Verify the payload sent to Kafka
        const sendCall = mockProducer.send.mock.calls[0][0];
        (0, globals_1.expect)(sendCall.topic).toBe(topic);
        const sentValue = sendCall.messages[0].value;
        (0, globals_1.expect)(Buffer.isBuffer(sentValue)).toBe(true);
        // Check Magic Byte
        (0, globals_1.expect)(sentValue.readUInt8(0)).toBe(0);
        // Check Schema ID
        (0, globals_1.expect)(sentValue.readUInt32BE(1)).toBe(schemaId);
        // Check Payload (JSON)
        const payloadStr = sentValue.subarray(5).toString();
        (0, globals_1.expect)(JSON.parse(payloadStr)).toEqual(message);
    });
    (0, globals_1.it)('should throw error if schema registry fails (e.g. incompatible schema)', async () => {
        globals_1.jest.spyOn(schemaRegistry, 'getId').mockRejectedValue(new Error('Incompatible schema'));
        const topic = 'incompatible-topic';
        const message = { id: 'fail', data: 'fail' };
        await (0, globals_1.expect)(producerWrapper.send(topic, [message])).rejects.toThrow('Incompatible schema');
    });
});
