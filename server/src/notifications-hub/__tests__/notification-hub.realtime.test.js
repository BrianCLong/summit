"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const NotificationHub_js_1 = require("../NotificationHub.js");
const EventSchema_js_1 = require("../events/EventSchema.js");
const RealtimeReceiver_js_1 = require("../receivers/RealtimeReceiver.js");
globals_1.describe.skip('NotificationHub realtime batching and digests', () => {
    (0, globals_1.it)('queues realtime notifications and emits a digest', async () => {
        const manager = new RealtimeReceiver_js_1.RealtimeSessionManager();
        const received = [];
        manager.addClient({
            id: 'client-1',
            userId: 'user-1',
            type: 'sse',
            send: async (payload) => {
                received.push(JSON.parse(payload));
            },
        });
        const hub = new NotificationHub_js_1.NotificationHub({
            receivers: {
                realtime: { enabled: true, config: { manager } },
            },
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
                                recipients: [{ type: 'user', id: 'user-1' }],
                            },
                        ],
                        priority: 1,
                    },
                ],
                defaultChannels: [],
            },
            storage: { enabled: false, retentionDays: 0 },
        });
        await hub.initialize();
        await hub.setUserPreferences('user-1', {
            userId: 'user-1',
            channels: {
                realtime: { enabled: true, batchingEnabled: true, batchingWindowMinutes: 0.01 },
            },
            quietHours: { enabled: false, start: '00:00', end: '00:00', timezone: 'UTC' },
            severityThresholds: {},
            eventTypeFilters: {},
        });
        const baseEvent = new EventSchema_js_1.EventBuilder()
            .type(EventSchema_js_1.EventType.ALERT_TRIGGERED)
            .severity(EventSchema_js_1.EventSeverity.HIGH)
            .actor({ id: 'actor-1', type: 'system', name: 'tester' })
            .subject({ type: 'resource', id: 'r-1', name: 'Resource' })
            .context({ tenantId: 'tenant-1' })
            .title('Test Alert')
            .message('first message')
            .build();
        await hub.notify(baseEvent);
        await hub.notify({ ...baseEvent, id: `${baseEvent.id}-2`, message: 'second message' });
        await new Promise((resolve) => setTimeout(resolve, 700));
        (0, globals_1.expect)(received.length).toBe(1);
        (0, globals_1.expect)(received[0].event.type).toBe(EventSchema_js_1.EventType.NOTIFICATION_DIGEST);
        (0, globals_1.expect)(received[0].digest).toBe(true);
    });
});
