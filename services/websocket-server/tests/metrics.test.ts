import request from 'supertest';
import { WebSocketServer } from '../src/server';
import { WebSocketConfig } from '../src/types/index';
import { jest, describe, it, expect, beforeAll, afterAll, afterEach } from '@jest/globals';

// Mock ioredis
jest.mock('ioredis', () => {
  const mRedis = {
    on: jest.fn(),
    duplicate: jest.fn().mockReturnThis(),
    quit: jest.fn().mockImplementation(() => Promise.resolve('OK')),
    get: jest.fn(),
    set: jest.fn(),
    publish: jest.fn(),
    subscribe: jest.fn(),
    defineCommand: jest.fn(),
    scanStream: jest.fn().mockReturnValue({ on: jest.fn() }),
  };
  return jest.fn(() => mRedis);
});

// Mock @socket.io/redis-adapter
jest.mock('@socket.io/redis-adapter', () => ({
  createAdapter: jest.fn(() => (nsp: any) => nsp),
}));


describe('WebSocket Metrics Endpoint', () => {
  let server: WebSocketServer;

  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  afterEach(async () => {
    if (server) {
      // Use fake timers during stop since it has a setTimeout
      jest.useFakeTimers();
      const stopPromise = server.stop();
      jest.runAllTimers();
      try { await stopPromise; } catch (e) {} // ignore "Server is not running" error from stop() if we never called start()
    }
    jest.clearAllMocks();
  });

  it('should return metrics in dev mode', async () => {
    jest.useRealTimers(); // Real timers required for supertest
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    const config: WebSocketConfig = {
      port: 0,
      host: 'localhost',
      redis: { host: 'localhost', port: 6379, password: 'pass' },
      cors: { origin: '*', credentials: true },
      rateLimit: { burstSize: 10, messageRatePerSecond: 1, maxConnections: 100 },
      persistence: { enabled: false, ttl: 3600, maxMessages: 100 },
      clustering: { enabled: false, nodeId: 'test' },
      heartbeat: { interval: 1000, timeout: 5000 },
      jwt: { secret: 'test', algorithm: 'HS256' }
    };
    server = new WebSocketServer(config);
    const app = server.getApp();

    const response = await request(app).get('/_dev/ws-metrics');

    // We expect 200 OK
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);

    // Restore env
    process.env.NODE_ENV = originalEnv;
  });
});
