import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { KafkaProducerWrapper } from '../../src/streaming/KafkaProducer.js';
import { MockSchemaRegistry } from '../../src/streaming/SchemaRegistry.js';
import { Kafka } from 'kafkajs';

jest.mock('kafkajs', () => ({
  Kafka: jest.fn(),
}));

describe('KafkaProducerWrapper', () => {
  let producerWrapper: KafkaProducerWrapper;
  let schemaRegistry: MockSchemaRegistry;
  let mockProducer: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockProducer = {
      connect: jest.fn<any>().mockResolvedValue(undefined),
      disconnect: jest.fn<any>().mockResolvedValue(undefined),
      send: jest.fn<any>().mockResolvedValue(undefined),
    };

    (Kafka as unknown as jest.Mock).mockImplementation(() => ({
      producer: jest.fn(() => mockProducer),
    }));

    schemaRegistry = new MockSchemaRegistry();
    producerWrapper = new KafkaProducerWrapper({
      clientId: 'test-client',
      brokers: ['localhost:9092'],
      schemaRegistry,
    });
  });

  it('should connect to kafka', async () => {
    await producerWrapper.connect();
    expect(mockProducer.connect).toHaveBeenCalled();
  });

  it('should send messages with schema encoding', async () => {
    const topic = 'test-topic';
    const message = { id: '123', data: 'test' };

    // Register schema to get an ID. MockSchemaRegistry starts at 1.
    const schemaId = await schemaRegistry.register(topic, {});

    await producerWrapper.send(topic, [message]);

    expect(mockProducer.connect).toHaveBeenCalled();

    // Verify the payload sent to Kafka
    const sendCall = mockProducer.send.mock.calls[0][0];
    expect(sendCall.topic).toBe(topic);
    const sentValue = sendCall.messages[0].value;

    expect(Buffer.isBuffer(sentValue)).toBe(true);
    // Check Magic Byte
    expect(sentValue.readUInt8(0)).toBe(0);
    // Check Schema ID
    expect(sentValue.readUInt32BE(1)).toBe(schemaId);

    // Check Payload (JSON)
    const payloadStr = sentValue.subarray(5).toString();
    expect(JSON.parse(payloadStr)).toEqual(message);
  });

  it('should throw error if schema registry fails (e.g. incompatible schema)', async () => {
    jest.spyOn(schemaRegistry, 'getId').mockRejectedValue(new Error('Incompatible schema'));

    const topic = 'incompatible-topic';
    const message = { id: 'fail', data: 'fail' };

    await expect(producerWrapper.send(topic, [message])).rejects.toThrow('Incompatible schema');
  });
});
