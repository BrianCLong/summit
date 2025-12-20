import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { AggregationProcessor } from '../../src/streaming/processing/AggregationProcessor.js';
import { KafkaConsumerWrapper } from '../../src/streaming/KafkaConsumer.js';
import { KafkaProducerWrapper } from '../../src/streaming/KafkaProducer.js';
import { StateStore } from '../../src/streaming/processing/StateStore.js';

jest.mock('../../src/streaming/KafkaConsumer.js');
jest.mock('../../src/streaming/KafkaProducer.js');

describe('Chaos Resilience', () => {
  let processor: AggregationProcessor;
  let mockConsumer: any;
  let mockProducer: any;
  let mockStateStore: jest.Mocked<StateStore>;

  beforeEach(() => {
    mockConsumer = new KafkaConsumerWrapper({} as any);
    mockProducer = new KafkaProducerWrapper({} as any);
    mockStateStore = {
      get: jest.fn(),
      set: jest.fn(),
      increment: jest.fn(),
    } as any;

    mockConsumer.run = jest.fn();
    mockProducer.send = jest.fn();
    mockConsumer.disconnect = jest.fn();
    mockProducer.disconnect = jest.fn();

    processor = new AggregationProcessor(
      mockConsumer,
      mockProducer,
      'input',
      'output',
      'chaos-test',
      mockStateStore
    );
  });

  it('should propagate state store errors to consumer', async () => {
    // If Redis fails, processor should throw so Consumer can retry/DLQ
    mockStateStore.increment.mockRejectedValue(new Error('Redis Connection Lost'));

    let handler: (msg: any) => Promise<void>;
    (mockConsumer.run as jest.Mock).mockImplementation(async (opts: any) => {
        // If opts has partition config, handler is in eachMessage
        if (opts.eachMessage) handler = opts.eachMessage;
        else handler = opts;
    });

    await processor.start();

    // Simulate message
    const msg = { subject: 'e1', data: { val: 1 } };

    // Expect the handler to throw the Redis error
    // @ts-ignore
    await expect(handler(msg)).rejects.toThrow('Redis Connection Lost');
  });
});
