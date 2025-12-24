import { NotificationHub } from '../NotificationHub.js';
import { EventBuilder, EventSeverity, EventType } from '../events/EventSchema.js';
import { RealtimeSessionManager } from '../receivers/RealtimeReceiver.js';

const buildEvent = (message: string) =>
  new EventBuilder()
    .type(EventType.ALERT_TRIGGERED)
    .severity(EventSeverity.HIGH)
    .actor({ id: 'actor-1', type: 'system', name: 'tester' })
    .subject({ type: 'resource', id: 'r-1', name: 'Resource' })
    .context({ tenantId: 'tenant-1' })
    .title('Test Alert')
    .message(message)
    .build();

describe('NotificationHub integration behaviors', () => {
  it('enforces per-user rate limits and supports DLQ retry', async () => {
    const manager = new RealtimeSessionManager();
    const received: any[] = [];
    manager.addClient({
      id: 'client-rl',
      userId: 'user-rl',
      type: 'websocket',
      send: async (payload: string) => {
        received.push(JSON.parse(payload));
      },
    });

    const hub = new NotificationHub({
      receivers: { realtime: { enabled: true, config: { manager } } },
      routing: {
        rules: [
          {
            id: 'all-users',
            name: 'route-all',
            enabled: true,
            conditions: [],
            actions: [
              {
                type: 'notify',
                channels: ['realtime'],
                recipients: [{ type: 'user', id: 'user-rl' }],
              },
            ],
            priority: 1,
          },
        ],
        defaultChannels: [],
      },
      rateLimiting: { maxPerMinute: 1 },
    });

    await hub.initialize();
    await hub.setUserPreferences('user-rl', {
      userId: 'user-rl',
      channels: { realtime: { enabled: true } },
    } as any);

    await hub.notify(buildEvent('first')); // allowed
    await hub.notify(buildEvent('second')); // rate limited

    const dlq = hub.getDeadLetterQueue();
    expect(dlq.length).toBe(1);
    expect(dlq[0].recipientId).toBe('user-rl');

    // reset limiter window so retry can flow
    (hub as any).rateLimiter.set('user-rl', { windowStart: Date.now() - 61000, count: 0 });
    const retryResult = await hub.retryDeadLetter(dlq[0].id);

    expect(retryResult?.success).toBe(true);
    expect(hub.getDeadLetterQueue().length).toBe(0);
    expect(received.length).toBeGreaterThan(0);
  });

  it('pools realtime connections with eviction', async () => {
    const manager = new RealtimeSessionManager({ maxPerUser: 1 });
    const evicted: string[] = [];
    manager.on('evicted', (client) => {
      evicted.push(client.id);
    });

    manager.addClient({ id: 'client-one', userId: 'user-pool', type: 'websocket', send: async () => {} });
    manager.addClient({ id: 'client-two', userId: 'user-pool', type: 'websocket', send: async () => {} });

    expect(evicted).toContain('client-one');
    expect(manager.getPoolState('user-pool')).toEqual(['client-two']);
    expect(manager.hasRecipient('user-pool')).toBe(true);
  });

  it('exposes Prometheus metrics with dead letter gauge', async () => {
    const manager = new RealtimeSessionManager();
    manager.addClient({ id: 'client-metrics', userId: 'user-metrics', type: 'sse', send: async () => {} });

    const hub = new NotificationHub({
      receivers: { realtime: { enabled: true, config: { manager } } },
      routing: {
        rules: [
          {
            id: 'metrics',
            name: 'metrics',
            enabled: true,
            conditions: [],
            actions: [
              {
                type: 'notify',
                channels: ['realtime'],
                recipients: [{ type: 'user', id: 'user-metrics' }],
              },
            ],
            priority: 1,
          },
        ],
        defaultChannels: [],
      },
    });

    await hub.initialize();
    await hub.setUserPreferences('user-metrics', {
      userId: 'user-metrics',
      channels: { realtime: { enabled: true } },
    } as any);

    await hub.notify(buildEvent('metrics one'));
    const metrics = await hub.getPrometheusMetrics();

    expect(metrics).toContain('notification_events_total');
    expect(metrics).toContain('notification_notifications_total');
    expect(metrics).toContain('notification_dead_letter_gauge');
    expect(metrics).toContain('notification_delivery_latency_ms');
  });

  it('batches channel deliveries into a digest and flushes deterministically', async () => {
    jest.useFakeTimers();
    const hub = new NotificationHub({
      receivers: {
        email: {
          enabled: true,
          config: {
            from: { name: 'Digest Bot', email: 'digest@example.com' },
            simulation: { enabled: false },
          },
        },
      },
      routing: {
        rules: [
          {
            id: 'digest-email',
            name: 'digest-email',
            enabled: true,
            conditions: [],
            actions: [
              {
                type: 'notify',
                channels: ['email'],
                recipients: [{ type: 'email', id: 'digest-user@example.com' }],
              },
            ],
            priority: 1,
          },
        ],
        defaultChannels: [],
      },
    });

    await hub.initialize();
    await hub.setUserPreferences('digest-user@example.com', {
      userId: 'digest-user@example.com',
      channels: { email: { enabled: true, batchingEnabled: true, batchingWindowMinutes: 1 } },
    } as any);

    await hub.notify(buildEvent('digest-one'));
    await hub.notify(buildEvent('digest-two'));

    // No immediate deliveries because they are batched
    expect(hub.getDeliveryHistory({ recipientId: 'digest-user@example.com' }).length).toBe(0);

    jest.advanceTimersByTime(60_000);
    await jest.runOnlyPendingTimersAsync();

    const history = hub.getDeliveryHistory({
      recipientId: 'digest-user@example.com',
      channel: 'email',
    });

    expect(history.length).toBe(1);
    expect(history[0].success).toBe(true);
    expect(history[0].metadata?.latencyMs).toBeGreaterThanOrEqual(0);

    jest.useRealTimers();
  });
});
