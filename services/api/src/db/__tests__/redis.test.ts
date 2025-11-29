/**
 * Tests for Redis Connection
 *
 * MIT License
 * Copyright (c) 2025 IntelGraph
 */

import Redis from 'ioredis';
import { RedisConnection } from '../redis.js';

// Mock dependencies
jest.mock('ioredis');
jest.mock('../utils/logger.js', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

describe('RedisConnection', () => {
  let connection: any;
  let mockClient: jest.Mocked<Redis>;
  let mockSubscriber: jest.Mocked<Redis>;
  let mockPublisher: jest.Mocked<Redis>;
  let eventHandlers: Map<string, Function[]>;

  beforeEach(() => {
    eventHandlers = new Map();

    const createMockRedis = () => ({
      connect: jest.fn().mockResolvedValue(undefined),
      disconnect: jest.fn().mockResolvedValue(undefined),
      quit: jest.fn().mockResolvedValue(undefined),
      on: jest.fn((event, handler) => {
        if (!eventHandlers.has(event)) {
          eventHandlers.set(event, []);
        }
        eventHandlers.get(event)!.push(handler);
      }),
      get: jest.fn(),
      set: jest.fn(),
      setex: jest.fn(),
      del: jest.fn(),
      exists: jest.fn(),
      expire: jest.fn(),
      ttl: jest.fn(),
      incr: jest.fn(),
      decr: jest.fn(),
      lpush: jest.fn(),
      rpush: jest.fn(),
      lrange: jest.fn(),
      hget: jest.fn(),
      hset: jest.fn(),
      hgetall: jest.fn(),
      subscribe: jest.fn(),
      unsubscribe: jest.fn(),
      publish: jest.fn(),
    });

    mockClient = createMockRedis() as any;
    mockSubscriber = createMockRedis() as any;
    mockPublisher = createMockRedis() as any;

    let callCount = 0;
    (Redis as unknown as jest.Mock).mockImplementation(() => {
      callCount++;
      if (callCount === 1) return mockClient;
      if (callCount === 2) return mockSubscriber;
      if (callCount === 3) return mockPublisher;
      return mockClient;
    });

    // Create a fresh instance for each test
    const RedisConnectionClass = require('../redis.js').default;
    connection = new (RedisConnectionClass || class RedisConnection {})();

    jest.clearAllMocks();
  });

  describe('connect', () => {
    it('should establish connection with default configuration', async () => {
      delete process.env.REDIS_HOST;
      delete process.env.REDIS_PORT;
      delete process.env.REDIS_PASSWORD;
      delete process.env.REDIS_DB;
      delete process.env.REDIS_KEY_PREFIX;

      await connection.connect();

      expect(Redis).toHaveBeenCalledWith(
        expect.objectContaining({
          host: 'localhost',
          port: 6379,
          db: 0,
          keyPrefix: 'intelgraph:',
        }),
      );
    });

    it('should establish connection with environment configuration', async () => {
      process.env.REDIS_HOST = 'redis.example.com';
      process.env.REDIS_PORT = '6380';
      process.env.REDIS_PASSWORD = 'secret123';
      process.env.REDIS_DB = '2';
      process.env.REDIS_KEY_PREFIX = 'myapp:';

      await connection.connect();

      expect(Redis).toHaveBeenCalledWith(
        expect.objectContaining({
          host: 'redis.example.com',
          port: 6380,
          password: 'secret123',
          db: 2,
          keyPrefix: 'myapp:',
        }),
      );

      // Clean up
      delete process.env.REDIS_HOST;
      delete process.env.REDIS_PORT;
      delete process.env.REDIS_PASSWORD;
      delete process.env.REDIS_DB;
      delete process.env.REDIS_KEY_PREFIX;
    });

    it('should create separate clients for pub/sub', async () => {
      await connection.connect();

      expect(Redis).toHaveBeenCalledTimes(3);
      expect(mockClient.connect).toHaveBeenCalled();
      expect(mockSubscriber.connect).toHaveBeenCalled();
      expect(mockPublisher.connect).toHaveBeenCalled();
    });

    it('should setup error handlers for all clients', async () => {
      await connection.connect();

      expect(mockClient.on).toHaveBeenCalledWith('error', expect.any(Function));
      expect(mockClient.on).toHaveBeenCalledWith(
        'reconnecting',
        expect.any(Function),
      );
      expect(mockClient.on).toHaveBeenCalledWith('connect', expect.any(Function));

      expect(mockSubscriber.on).toHaveBeenCalledWith('error', expect.any(Function));
      expect(mockPublisher.on).toHaveBeenCalledWith('error', expect.any(Function));
    });

    it('should skip connection if already connected', async () => {
      await connection.connect();
      const firstCallCount = (Redis as unknown as jest.Mock).mock.calls.length;

      await connection.connect();

      // Should not create new Redis instances
      expect((Redis as unknown as jest.Mock).mock.calls.length).toBe(
        firstCallCount,
      );
    });

    it('should throw error when connection fails', async () => {
      mockClient.connect.mockRejectedValue(new Error('Connection failed'));

      await expect(connection.connect()).rejects.toThrow('Connection failed');
    });

    it('should log connection events', async () => {
      await connection.connect();

      const { logger } = require('../utils/logger.js');

      // Trigger error event
      const errorHandlers = eventHandlers.get('error') || [];
      errorHandlers.forEach((handler) => handler(new Error('Test error')));

      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Redis'),
        }),
      );

      // Trigger reconnecting event
      const reconnectingHandlers = eventHandlers.get('reconnecting') || [];
      reconnectingHandlers.forEach((handler) => handler());

      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('reconnecting'),
      );

      // Trigger connect event
      const connectHandlers = eventHandlers.get('connect') || [];
      connectHandlers.forEach((handler) => handler());

      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('connected'),
      );
    });
  });

  describe('get', () => {
    beforeEach(async () => {
      await connection.connect();
    });

    it('should get and parse JSON value', async () => {
      const mockData = { id: 1, name: 'Test' };
      mockClient.get.mockResolvedValue(JSON.stringify(mockData));

      const result = await connection.get('test-key');

      expect(result).toEqual(mockData);
      expect(mockClient.get).toHaveBeenCalledWith('test-key');
    });

    it('should return null when key does not exist', async () => {
      mockClient.get.mockResolvedValue(null);

      const result = await connection.get('nonexistent-key');

      expect(result).toBeNull();
    });

    it('should return null on parse error', async () => {
      mockClient.get.mockResolvedValue('invalid json');

      const result = await connection.get('bad-key');

      expect(result).toBeNull();
    });

    it('should throw error when client not initialized', async () => {
      const uninitializedConnection = new (
        require('../redis.js').default || class {}
      )();

      await expect(uninitializedConnection.get('key')).rejects.toThrow(
        'Redis client not initialized',
      );
    });

    it('should handle Redis errors gracefully', async () => {
      mockClient.get.mockRejectedValue(new Error('Redis error'));

      const result = await connection.get('error-key');

      expect(result).toBeNull();
    });
  });

  describe('set', () => {
    beforeEach(async () => {
      await connection.connect();
    });

    it('should set value without TTL', async () => {
      mockClient.set.mockResolvedValue('OK');

      const result = await connection.set('test-key', { data: 'value' });

      expect(result).toBe(true);
      expect(mockClient.set).toHaveBeenCalledWith(
        'test-key',
        JSON.stringify({ data: 'value' }),
      );
    });

    it('should set value with TTL', async () => {
      mockClient.setex.mockResolvedValue('OK');

      const result = await connection.set('test-key', { data: 'value' }, 3600);

      expect(result).toBe(true);
      expect(mockClient.setex).toHaveBeenCalledWith(
        'test-key',
        3600,
        JSON.stringify({ data: 'value' }),
      );
    });

    it('should throw error when client not initialized', async () => {
      const uninitializedConnection = new (
        require('../redis.js').default || class {}
      )();

      await expect(
        uninitializedConnection.set('key', 'value'),
      ).rejects.toThrow('Redis client not initialized');
    });

    it('should return false on error', async () => {
      mockClient.set.mockRejectedValue(new Error('Redis error'));

      const result = await connection.set('error-key', 'value');

      expect(result).toBe(false);
    });

    it('should handle various data types', async () => {
      mockClient.set.mockResolvedValue('OK');

      await connection.set('string', 'hello');
      await connection.set('number', 42);
      await connection.set('boolean', true);
      await connection.set('object', { nested: { data: 'value' } });
      await connection.set('array', [1, 2, 3]);

      expect(mockClient.set).toHaveBeenCalledTimes(5);
    });
  });

  describe('del', () => {
    beforeEach(async () => {
      await connection.connect();
    });

    it('should delete single key', async () => {
      mockClient.del.mockResolvedValue(1);

      const result = await connection.del('test-key');

      expect(result).toBe(true);
      expect(mockClient.del).toHaveBeenCalledWith('test-key');
    });

    it('should delete multiple keys', async () => {
      mockClient.del.mockResolvedValue(3);

      const result = await connection.del(['key1', 'key2', 'key3']);

      expect(result).toBe(true);
      expect(mockClient.del).toHaveBeenCalledWith('key1', 'key2', 'key3');
    });

    it('should return false when no keys deleted', async () => {
      mockClient.del.mockResolvedValue(0);

      const result = await connection.del('nonexistent-key');

      expect(result).toBe(false);
    });

    it('should return false on error', async () => {
      mockClient.del.mockRejectedValue(new Error('Redis error'));

      const result = await connection.del('error-key');

      expect(result).toBe(false);
    });
  });

  describe('exists', () => {
    beforeEach(async () => {
      await connection.connect();
    });

    it('should return true when key exists', async () => {
      mockClient.exists.mockResolvedValue(1);

      const result = await connection.exists('test-key');

      expect(result).toBe(true);
      expect(mockClient.exists).toHaveBeenCalledWith('test-key');
    });

    it('should return false when key does not exist', async () => {
      mockClient.exists.mockResolvedValue(0);

      const result = await connection.exists('nonexistent-key');

      expect(result).toBe(false);
    });

    it('should return false on error', async () => {
      mockClient.exists.mockRejectedValue(new Error('Redis error'));

      const result = await connection.exists('error-key');

      expect(result).toBe(false);
    });
  });

  describe('expire', () => {
    beforeEach(async () => {
      await connection.connect();
    });

    it('should set expiration on key', async () => {
      mockClient.expire.mockResolvedValue(1);

      const result = await connection.expire('test-key', 3600);

      expect(result).toBe(true);
      expect(mockClient.expire).toHaveBeenCalledWith('test-key', 3600);
    });

    it('should return false when key does not exist', async () => {
      mockClient.expire.mockResolvedValue(0);

      const result = await connection.expire('nonexistent-key', 3600);

      expect(result).toBe(false);
    });

    it('should return false on error', async () => {
      mockClient.expire.mockRejectedValue(new Error('Redis error'));

      const result = await connection.expire('error-key', 3600);

      expect(result).toBe(false);
    });
  });

  describe('incr and decr', () => {
    beforeEach(async () => {
      await connection.connect();
    });

    it('should increment counter', async () => {
      mockClient.incr.mockResolvedValue(5);

      const result = await connection.incr('counter');

      expect(result).toBe(5);
      expect(mockClient.incr).toHaveBeenCalledWith('counter');
    });

    it('should decrement counter', async () => {
      mockClient.decr.mockResolvedValue(3);

      const result = await connection.decr('counter');

      expect(result).toBe(3);
      expect(mockClient.decr).toHaveBeenCalledWith('counter');
    });

    it('should return 0 on error for incr', async () => {
      mockClient.incr.mockRejectedValue(new Error('Redis error'));

      const result = await connection.incr('error-key');

      expect(result).toBe(0);
    });

    it('should return 0 on error for decr', async () => {
      mockClient.decr.mockRejectedValue(new Error('Redis error'));

      const result = await connection.decr('error-key');

      expect(result).toBe(0);
    });
  });

  describe('pub/sub', () => {
    beforeEach(async () => {
      await connection.connect();
    });

    it('should subscribe to channel', async () => {
      const callback = jest.fn();
      mockSubscriber.subscribe.mockResolvedValue(1);

      await connection.subscribe('test-channel', callback);

      expect(mockSubscriber.subscribe).toHaveBeenCalledWith('test-channel');
    });

    it('should publish message to channel', async () => {
      mockPublisher.publish.mockResolvedValue(1);

      const result = await connection.publish('test-channel', {
        message: 'hello',
      });

      expect(result).toBe(true);
      expect(mockPublisher.publish).toHaveBeenCalledWith(
        'test-channel',
        JSON.stringify({ message: 'hello' }),
      );
    });

    it('should unsubscribe from channel', async () => {
      mockSubscriber.unsubscribe.mockResolvedValue(undefined);

      await connection.unsubscribe('test-channel');

      expect(mockSubscriber.unsubscribe).toHaveBeenCalledWith('test-channel');
    });

    it('should return false when publish fails', async () => {
      mockPublisher.publish.mockRejectedValue(new Error('Publish failed'));

      const result = await connection.publish('error-channel', { data: 'test' });

      expect(result).toBe(false);
    });
  });

  describe('close', () => {
    it('should close all connections', async () => {
      await connection.connect();

      await connection.close();

      expect(mockClient.quit).toHaveBeenCalled();
      expect(mockSubscriber.quit).toHaveBeenCalled();
      expect(mockPublisher.quit).toHaveBeenCalled();
    });

    it('should handle close when not connected', async () => {
      await expect(connection.close()).resolves.not.toThrow();
    });
  });

  describe('healthCheck', () => {
    beforeEach(async () => {
      await connection.connect();
    });

    it('should return healthy status when connected', async () => {
      mockClient.ping.mockResolvedValue('PONG');

      const health = await connection.healthCheck();

      expect(health.status).toBe('healthy');
      expect(health.details).toHaveProperty('connected');
    });

    it('should return disconnected status when not connected', async () => {
      const uninitializedConnection = new (
        require('../redis.js').default || class {}
      )();

      const health = await uninitializedConnection.healthCheck();

      expect(health.status).toBe('disconnected');
    });

    it('should return unhealthy status on error', async () => {
      mockClient.ping.mockRejectedValue(new Error('Ping failed'));

      const health = await connection.healthCheck();

      expect(health.status).toBe('unhealthy');
      expect(health.details).toHaveProperty('error');
    });
  });
});
