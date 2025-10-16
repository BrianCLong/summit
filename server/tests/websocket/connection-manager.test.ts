import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';
import {
  ConnectionState,
  WebSocketConnectionPool,
} from '../../src/websocket/connectionManager';

type Sendable = {
  send: (data: string) => void;
  close?: (code?: number, reason?: string) => void;
  getBufferedAmount?: () => number;
  readyState?: number;
};

class MockWebSocket implements Sendable {
  public messages: string[] = [];
  public readyState = 1;
  public bufferedAmount = 0;
  constructor(private readonly failSend = false) {}

  send(data: string) {
    if (this.failSend) {
      throw new Error('send failed');
    }
    this.messages.push(data);
  }

  close = jest.fn();

  getBufferedAmount() {
    return this.bufferedAmount;
  }
}

describe('WebSocketConnectionPool', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-01-01T00:00:00Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('queues messages during network interruptions and replays after reconnection', () => {
    const pool = new WebSocketConnectionPool({
      rateLimitPerSecond: 5,
      queueFlushInterval: 100,
      replayBatchSize: 10,
    });
    const ws = new MockWebSocket();
    const managed = pool.registerConnection(
      'tenantA@userA',
      ws as unknown as Sendable,
      {
        id: 'tenantA@userA',
        tenantId: 'tenantA',
        userId: 'userA',
      },
    );

    expect(managed.getState()).toBe(ConnectionState.CONNECTED);
    expect(ws.messages).toHaveLength(0);

    pool.send('tenantA@userA', JSON.stringify({ type: 'initial' }));
    expect(ws.messages).toHaveLength(1);

    pool.handleNetworkChange('offline');
    expect(managed.getState()).toBe(ConnectionState.RECONNECTING);

    pool.send('tenantA@userA', JSON.stringify({ type: 'queued' }));
    expect(managed.getQueueSize()).toBe(1);

    const replacement = new MockWebSocket();
    pool.rebindConnection('tenantA@userA', replacement as unknown as Sendable);
    expect(managed.getState()).toBe(ConnectionState.CONNECTED);

    jest.runOnlyPendingTimers();

    expect(replacement.messages.some((msg) => msg.includes('queued'))).toBe(
      true,
    );
    expect(managed.getQueueSize()).toBe(0);
  });

  it('marks connections as degraded and notifies clients on server restart', () => {
    const pool = new WebSocketConnectionPool({ queueFlushInterval: 50 });
    const ws = new MockWebSocket();
    const managed = pool.registerConnection(
      'tenantB@userB',
      ws as unknown as Sendable,
      {
        id: 'tenantB@userB',
        tenantId: 'tenantB',
        userId: 'userB',
      },
    );

    pool.handleServerRestart('maintenance');

    expect(managed.getState()).toBe(ConnectionState.DEGRADED);
    expect(managed.getQueueSize()).toBeGreaterThan(0);

    const restartReplacement = new MockWebSocket();
    pool.rebindConnection(
      'tenantB@userB',
      restartReplacement as unknown as Sendable,
    );
    jest.runOnlyPendingTimers();

    const restartMessages = restartReplacement.messages
      .map((msg) => {
        try {
          return JSON.parse(msg);
        } catch (error) {
          return null;
        }
      })
      .filter(Boolean);

    expect(
      restartMessages.some((payload) => payload?.type === 'server_restart'),
    ).toBe(true);
  });

  it('applies rate limiting and backpressure handling under load', () => {
    const pool = new WebSocketConnectionPool({
      rateLimitPerSecond: 1,
      queueFlushInterval: 100,
      backpressureThreshold: 5,
    });
    const ws = new MockWebSocket();
    ws.bufferedAmount = 10;

    const managed = pool.registerConnection(
      'tenantC@userC',
      ws as unknown as Sendable,
      {
        id: 'tenantC@userC',
        tenantId: 'tenantC',
        userId: 'userC',
      },
    );

    const firstSend = pool.send(
      'tenantC@userC',
      JSON.stringify({ type: 'burst-1' }),
    );
    expect(firstSend).toBe(false);
    expect(managed.getQueueSize()).toBe(1);

    ws.bufferedAmount = 0;
    const secondSend = pool.send(
      'tenantC@userC',
      JSON.stringify({ type: 'burst-2' }),
    );
    expect(secondSend).toBe(false);
    expect(managed.getQueueSize()).toBe(2);

    jest.advanceTimersByTime(1000);
    jest.runOnlyPendingTimers();

    expect(ws.messages.filter((msg) => msg.includes('burst-'))).toHaveLength(2);
    expect(managed.getQueueSize()).toBe(0);
  });
});
