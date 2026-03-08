"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const NotificationHub_js_1 = require("../NotificationHub.js");
const EventSchema_js_1 = require("../events/EventSchema.js");
const RealtimeReceiver_js_1 = require("../receivers/RealtimeReceiver.js");
const buildEvent = (message) => new EventSchema_js_1.EventBuilder()
    .type(EventSchema_js_1.EventType.ALERT_TRIGGERED)
    .severity(EventSchema_js_1.EventSeverity.HIGH)
    .actor({ id: 'actor-1', type: 'system', name: 'tester' })
    .subject({ type: 'resource', id: 'r-1', name: 'Resource' })
    .context({ tenantId: 'tenant-1' })
    .title('Test Alert')
    .message(message)
    .build();
(0, globals_1.describe)('NotificationHub integration behaviors', () => {
    (0, globals_1.it)('enforces per-user rate limits and supports DLQ retry', async () => {
        const manager = new RealtimeReceiver_js_1.RealtimeSessionManager();
        const received = [];
        manager.addClient({
            id: 'client-rl',
            userId: 'user-rl',
            type: 'websocket',
            send: async (payload) => {
                received.push(JSON.parse(payload));
            },
        });
        const hub = new NotificationHub_js_1.NotificationHub({
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
        });
        await hub.notify(buildEvent('first')); // allowed
        await hub.notify(buildEvent('second')); // rate limited
        const dlq = hub.getDeadLetterQueue();
        (0, globals_1.expect)(dlq.length).toBe(1);
        (0, globals_1.expect)(dlq[0].recipientId).toBe('user-rl');
        // reset limiter window so retry can flow
        hub.rateLimiter.set('user-rl', { windowStart: Date.now() - 61000, count: 0 });
        const retryResult = await hub.retryDeadLetter(dlq[0].id);
        (0, globals_1.expect)(retryResult?.success).toBe(true);
        (0, globals_1.expect)(hub.getDeadLetterQueue().length).toBe(0);
        (0, globals_1.expect)(received.length).toBeGreaterThan(0);
    });
    (0, globals_1.it)('pools realtime connections with eviction', async () => {
        const manager = new RealtimeReceiver_js_1.RealtimeSessionManager({ maxPerUser: 1 });
        const evicted = [];
        manager.on('evicted', (client) => {
            evicted.push(client.id);
        });
        manager.addClient({ id: 'client-one', userId: 'user-pool', type: 'websocket', send: async () => { } });
        manager.addClient({ id: 'client-two', userId: 'user-pool', type: 'websocket', send: async () => { } });
        (0, globals_1.expect)(evicted).toContain('client-one');
        (0, globals_1.expect)(manager.getPoolState('user-pool')).toEqual(['client-two']);
        (0, globals_1.expect)(manager.hasRecipient('user-pool')).toBe(true);
    });
    (0, globals_1.it)('exposes Prometheus metrics with dead letter gauge', async () => {
        const manager = new RealtimeReceiver_js_1.RealtimeSessionManager();
        manager.addClient({ id: 'client-metrics', userId: 'user-metrics', type: 'sse', send: async () => { } });
        const hub = new NotificationHub_js_1.NotificationHub({
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
        });
        await hub.notify(buildEvent('metrics one'));
        const metrics = await hub.getPrometheusMetrics();
        (0, globals_1.expect)(metrics).toContain('notification_events_total');
        (0, globals_1.expect)(metrics).toContain('notification_notifications_total');
        (0, globals_1.expect)(metrics).toContain('notification_dead_letter_gauge');
        (0, globals_1.expect)(metrics).toContain('notification_delivery_latency_ms');
    });
    (0, globals_1.it)('batches channel deliveries into a digest and flushes deterministically', async () => {
        globals_1.jest.useFakeTimers();
        const hub = new NotificationHub_js_1.NotificationHub({
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
        });
        await hub.notify(buildEvent('digest-one'));
        await hub.notify(buildEvent('digest-two'));
        // No immediate deliveries because they are batched
        (0, globals_1.expect)(hub.getDeliveryHistory({ recipientId: 'digest-user@example.com' }).length).toBe(0);
        globals_1.jest.advanceTimersByTime(60_000);
        await globals_1.jest.runOnlyPendingTimersAsync();
        const history = hub.getDeliveryHistory({
            recipientId: 'digest-user@example.com',
            channel: 'email',
        });
        (0, globals_1.expect)(history.length).toBe(1);
        (0, globals_1.expect)(history[0].success).toBe(true);
        (0, globals_1.expect)(history[0].metadata?.latencyMs).toBeGreaterThanOrEqual(0);
        globals_1.jest.useRealTimers();
    });
});
