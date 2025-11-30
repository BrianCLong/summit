import { NotificationHub } from '../NotificationHub.js';
import { EventBuilder, EventSeverity, EventType } from '../events/EventSchema.js';
import { RealtimeSessionManager } from '../receivers/RealtimeReceiver.js';

describe('NotificationHub realtime batching and digests', () => {
  it('queues realtime notifications and emits a digest', async () => {
    const manager = new RealtimeSessionManager();
    const received: any[] = [];
    manager.addClient({
      id: 'client-1',
      userId: 'user-1',
      type: 'sse',
      send: async (payload: string) => {
        received.push(JSON.parse(payload));
      },
    });

    const hub = new NotificationHub({
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

    const baseEvent = new EventBuilder()
      .type(EventType.ALERT_TRIGGERED)
      .severity(EventSeverity.HIGH)
      .actor({ id: 'actor-1', type: 'system', name: 'tester' })
      .subject({ type: 'resource', id: 'r-1', name: 'Resource' })
      .context({ tenantId: 'tenant-1' })
      .title('Test Alert')
      .message('first message')
      .build();

    await hub.notify(baseEvent);
    await hub.notify({ ...baseEvent, id: `${baseEvent.id}-2`, message: 'second message' });

    await new Promise((resolve) => setTimeout(resolve, 700));

    expect(received.length).toBe(1);
    expect(received[0].event.type).toBe(EventType.NOTIFICATION_DIGEST);
    expect(received[0].digest).toBe(true);

    const history = hub.getDeliveryHistory({ channel: 'realtime' });
    expect(history.some((entry) => entry.success)).toBe(true);
  });
});
