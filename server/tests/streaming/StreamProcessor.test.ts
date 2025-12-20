import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { AggregationProcessor } from '../../src/streaming/processing/AggregationProcessor.js';
import { KafkaConsumerWrapper } from '../../src/streaming/KafkaConsumer.js';
import { KafkaProducerWrapper } from '../../src/streaming/KafkaProducer.js';

// Mocks
jest.mock('../../src/streaming/KafkaConsumer.js');
jest.mock('../../src/streaming/KafkaProducer.js');

describe('AggregationProcessor', () => {
  let processor: AggregationProcessor;
  let mockConsumer: jest.Mocked<KafkaConsumerWrapper>;
  let mockProducer: jest.Mocked<KafkaProducerWrapper>;

  beforeEach(() => {
    mockConsumer = new KafkaConsumerWrapper({} as any) as any;
    mockProducer = new KafkaProducerWrapper({} as any) as any;

    mockConsumer.run = jest.fn();
    mockProducer.send = jest.fn();
    mockConsumer.disconnect = jest.fn();
    mockProducer.disconnect = jest.fn();

    processor = new AggregationProcessor(
      mockConsumer,
      mockProducer,
      'input-topic',
      'output-topic',
      'test-processor'
    );
  });

  it('should start and run consumer', async () => {
    await processor.start();
    expect(mockConsumer.run).toHaveBeenCalled();
  });

  it('should process and aggregate messages', async () => {
    // Get the handler passed to run
    let handler: (msg: any) => Promise<void>;
    (mockConsumer.run as jest.Mock).mockImplementation(async (opts: any) => {
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
      if (handler) await handler({ subject: entityId, data: { val: i } });
    }

    // After 5th message, it should emit
    expect(mockProducer.send).toHaveBeenCalledTimes(1);
    expect(mockProducer.send).toHaveBeenCalledWith(
      'output-topic',
      expect.arrayContaining([
        expect.objectContaining({
          type: 'AGGREGATION_UPDATE',
          entityId: 'entity-1',
          count: 5,
        })
      ])
    );
  });
});
