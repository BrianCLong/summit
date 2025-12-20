// @ts-nocheck
import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { KafkaConsumerWrapper } from '../../src/streaming/KafkaConsumer.js';
import { KafkaProducerWrapper } from '../../src/streaming/KafkaProducer.js';
import { Kafka } from 'kafkajs';

jest.mock('kafkajs');
jest.mock('../../src/streaming/KafkaProducer.js');

describe('KafkaConsumerWrapper', () => {
  let consumerWrapper: KafkaConsumerWrapper;
  let mockConsumer: any;
  let mockDlqProducer: jest.Mocked<KafkaProducerWrapper>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockConsumer = {
      connect: jest.fn<any>().mockResolvedValue(undefined),
      disconnect: jest.fn<any>().mockResolvedValue(undefined),
      subscribe: jest.fn<any>().mockResolvedValue(undefined),
      run: jest.fn<any>().mockResolvedValue(undefined),
    };

    (Kafka as unknown as jest.Mock).mockImplementation(() => ({
      consumer: jest.fn(() => mockConsumer),
    }));

    mockDlqProducer = new KafkaProducerWrapper({} as any) as any;
    mockDlqProducer.send = jest.fn();
  });

  it('should throw error if handler fails and no DLQ configured', async () => {
    consumerWrapper = new KafkaConsumerWrapper({
      clientId: 'test',
      brokers: ['localhost:9092'],
      groupId: 'group1'
    });

    const userHandler = jest.fn<() => Promise<void>>().mockRejectedValue(new Error('Processing failed'));

    // Cast to any to bypass strict checks if needed, or rely on correct generic
    await consumerWrapper.run(userHandler as any);

    const runCall = mockConsumer.run.mock.calls[0][0];
    const eachMessage = runCall.eachMessage;

    await expect(eachMessage({
        topic: 'test-topic',
        partition: 0,
        message: { value: Buffer.from(JSON.stringify({ foo: 'bar' })) }
    })).rejects.toThrow('Processing failed');
  });

  it('should send to DLQ if handler fails and DLQ configured', async () => {
    consumerWrapper = new KafkaConsumerWrapper({
      clientId: 'test',
      brokers: ['localhost:9092'],
      groupId: 'group1',
      dlqProducer: mockDlqProducer,
      dlqTopic: 'dlq-topic'
    });

    const userHandler = jest.fn<() => Promise<void>>().mockRejectedValue(new Error('Processing failed'));
    await consumerWrapper.run(userHandler as any);

    const runCall = mockConsumer.run.mock.calls[0][0];
    const eachMessage = runCall.eachMessage;

    await expect(eachMessage({
        topic: 'test-topic',
        partition: 0,
        message: { value: Buffer.from(JSON.stringify({ foo: 'bar' })) }
    })).resolves.not.toThrow();

    expect(mockDlqProducer.send).toHaveBeenCalledWith('dlq-topic', expect.any(Array));
  });
});
