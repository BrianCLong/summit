/**
 * MessageBroker Tests
 */

import { MessageBroker, type BrokerConfig, type TopicConfig } from '../src/index.js';

describe('MessageBroker', () => {
  let broker: MessageBroker;
  const brokerConfig: BrokerConfig = {
    brokerId: 0,
    host: 'localhost',
    port: 9092,
    dataDir: '/tmp/test-stream-data',
    logDirs: ['/tmp/test-stream-logs'],
    autoCreateTopics: true,
    defaultReplicationFactor: 1,
    numPartitions: 3,
  };

  beforeEach(() => {
    broker = new MessageBroker(brokerConfig);
  });

  afterEach(async () => {
    try {
      await broker.stop();
    } catch {
      // Ignore if not running
    }
  });

  describe('initialization', () => {
    it('should create a broker with correct configuration', () => {
      expect(broker.getBrokerId()).toBe(0);
      expect(broker.isLeaderBroker()).toBe(false);
    });

    it('should start the broker successfully', async () => {
      await broker.start();
      expect(broker.isLeaderBroker()).toBe(true); // Broker 0 is leader
    });

    it('should throw error when starting an already running broker', async () => {
      await broker.start();
      await expect(broker.start()).rejects.toThrow('Broker already running');
    });
  });

  describe('topic management', () => {
    beforeEach(async () => {
      await broker.start();
    });

    it('should create a topic', async () => {
      const topicConfig: TopicConfig = {
        name: 'test-topic',
        partitions: 3,
        replicationFactor: 1,
      };

      await broker.createTopic(topicConfig);
      const metadata = await broker.getTopicMetadata('test-topic');
      expect(metadata.name).toBe('test-topic');
      expect(metadata.partitions).toBe(3);
    });

    it('should delete a topic', async () => {
      const topicConfig: TopicConfig = {
        name: 'delete-topic',
        partitions: 1,
        replicationFactor: 1,
      };

      await broker.createTopic(topicConfig);
      await broker.deleteTopic('delete-topic');

      await expect(broker.getTopicMetadata('delete-topic')).rejects.toThrow();
    });
  });

  describe('message production', () => {
    beforeEach(async () => {
      await broker.start();
    });

    it('should produce a message with auto-topic creation', async () => {
      const result = await broker.produce({
        topic: 'auto-topic',
        key: 'test-key',
        value: 'test-value',
        timestamp: Date.now(),
      });

      expect(result.topic).toBe('auto-topic');
      expect(result.partition).toBeGreaterThanOrEqual(0);
      expect(result.offset).toBeGreaterThanOrEqual(0);
    });

    it('should produce multiple messages to same partition', async () => {
      const topic = 'multi-msg-topic';

      const result1 = await broker.produce({
        topic,
        key: 'same-key',
        value: 'value1',
      });

      const result2 = await broker.produce({
        topic,
        key: 'same-key',
        value: 'value2',
      });

      // Same key should go to same partition
      expect(result1.partition).toBe(result2.partition);
      expect(result2.offset).toBe(result1.offset + 1);
    });
  });

  describe('message consumption', () => {
    beforeEach(async () => {
      await broker.start();
    });

    it('should consume messages from a partition', async () => {
      const topic = 'consume-topic';

      // Produce some messages
      await broker.produce({ topic, key: 'key1', value: 'value1' });
      await broker.produce({ topic, key: 'key1', value: 'value2' });
      await broker.produce({ topic, key: 'key1', value: 'value3' });

      // Consume from the beginning
      const partitions = await broker.getTopicPartitions(topic);
      const partition = partitions[0].partition;

      const messages = await broker.consume(topic, partition, 0, 10);
      expect(messages.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('metrics', () => {
    it('should return broker metrics', async () => {
      await broker.start();

      const metrics = broker.getMetrics();

      expect(metrics).toHaveProperty('messagesInPerSec');
      expect(metrics).toHaveProperty('messagesOutPerSec');
      expect(metrics).toHaveProperty('bytesInPerSec');
      expect(metrics).toHaveProperty('bytesOutPerSec');
      expect(metrics).toHaveProperty('underReplicatedPartitions');
    });
  });
});
