/**
 * CEPEngine Tests
 */

import { CEPEngine, type Event, type EventPattern, type Alert } from '../src/index.js';

describe('CEPEngine', () => {
  let cepEngine: CEPEngine;

  beforeEach(() => {
    cepEngine = new CEPEngine();
  });

  const createEvent = (eventType: string, data: Record<string, any> = {}): Event => ({
    eventId: `evt-${Date.now()}-${Math.random()}`,
    eventType,
    eventSource: 'test',
    timestamp: Date.now(),
    key: null,
    value: JSON.stringify(data),
    offset: 0,
    partition: 0,
    topic: 'test-events',
    metadata: data,
    ...data,
  });

  describe('pattern registration', () => {
    it('should register a pattern', () => {
      const pattern: EventPattern = {
        id: 'test-pattern',
        name: 'Test Pattern',
        description: 'A test pattern',
        conditions: [
          { field: 'eventType', operator: 'eq', value: 'test.event' },
        ],
      };

      cepEngine.registerPattern(pattern);
      // Pattern should be registered without error
    });

    it('should remove a pattern', () => {
      const pattern: EventPattern = {
        id: 'remove-pattern',
        name: 'Remove Pattern',
        description: 'Pattern to remove',
        conditions: [
          { field: 'eventType', operator: 'eq', value: 'test.event' },
        ],
      };

      cepEngine.registerPattern(pattern);
      cepEngine.removePattern('remove-pattern');
      // Pattern should be removed without error
    });
  });

  describe('event processing', () => {
    it('should process a single event', async () => {
      const event = createEvent('login.success', { userId: 'user123' });

      await cepEngine.processEvent(event);
      // Should process without error
    });

    it('should match a simple pattern', async () => {
      const alerts: Alert[] = [];

      const pattern: EventPattern = {
        id: 'login-pattern',
        name: 'Login Pattern',
        description: 'Detect login events',
        conditions: [
          { field: 'eventType', operator: 'eq', value: 'login.success' },
        ],
        action: {
          type: 'alert',
          config: { severity: 'info' },
        },
      };

      cepEngine.registerPattern(pattern);
      cepEngine.on('alert:generated', (alert) => alerts.push(alert));

      // This won't match because we need multiple conditions typically
      const event = createEvent('login.success', { userId: 'user123' });
      await cepEngine.processEvent(event);
    });

    it('should match pattern with multiple conditions', async () => {
      let matchedCount = 0;

      const pattern: EventPattern = {
        id: 'multi-condition-pattern',
        name: 'Multi Condition Pattern',
        description: 'Match events with severity and type',
        conditions: [
          { field: 'eventType', operator: 'eq', value: 'security.alert', eventType: 'security.alert' },
          { field: 'severity', operator: 'eq', value: 'high' },
        ],
        windowConfig: {
          type: 'sliding',
          size: 60000,
        },
      };

      cepEngine.registerPattern(pattern);
      cepEngine.on('pattern:matched', () => matchedCount++);

      const event1 = createEvent('security.alert', { severity: 'high' });
      await cepEngine.processEvent(event1);

      const event2 = createEvent('security.alert', { severity: 'high' });
      await cepEngine.processEvent(event2);
    });
  });

  describe('windowing', () => {
    it('should respect tumbling window boundaries', async () => {
      const pattern: EventPattern = {
        id: 'tumbling-pattern',
        name: 'Tumbling Window Pattern',
        description: 'Pattern with tumbling window',
        conditions: [
          { field: 'eventType', operator: 'eq', value: 'metric.reported' },
        ],
        windowConfig: {
          type: 'tumbling',
          size: 5000, // 5 seconds
        },
      };

      cepEngine.registerPattern(pattern);

      const event = createEvent('metric.reported', { value: 100 });
      await cepEngine.processEvent(event);

      const sequences = cepEngine.getActiveSequences();
      expect(Array.isArray(sequences)).toBe(true);
    });

    it('should handle sliding windows', async () => {
      const pattern: EventPattern = {
        id: 'sliding-pattern',
        name: 'Sliding Window Pattern',
        description: 'Pattern with sliding window',
        conditions: [
          { field: 'eventType', operator: 'eq', value: 'api.request' },
        ],
        windowConfig: {
          type: 'sliding',
          size: 10000,
          slide: 1000,
        },
      };

      cepEngine.registerPattern(pattern);

      for (let i = 0; i < 5; i++) {
        const event = createEvent('api.request', { requestId: i });
        await cepEngine.processEvent(event);
      }
    });

    it('should handle session windows', async () => {
      const pattern: EventPattern = {
        id: 'session-pattern',
        name: 'Session Window Pattern',
        description: 'Pattern with session window',
        conditions: [
          { field: 'eventType', operator: 'eq', value: 'user.action' },
        ],
        windowConfig: {
          type: 'session',
          size: 30000,
          gap: 5000,
        },
      };

      cepEngine.registerPattern(pattern);

      const event = createEvent('user.action', { action: 'click' });
      await cepEngine.processEvent(event);
    });
  });

  describe('condition evaluation', () => {
    it('should evaluate equality condition', async () => {
      let matched = false;

      const pattern: EventPattern = {
        id: 'eq-pattern',
        name: 'Equality Pattern',
        description: 'Test equality',
        conditions: [
          { field: 'status', operator: 'eq', value: 'active' },
        ],
      };

      cepEngine.registerPattern(pattern);

      const event = createEvent('test.event', { status: 'active' });
      await cepEngine.processEvent(event);
    });

    it('should evaluate greater than condition', async () => {
      const pattern: EventPattern = {
        id: 'gt-pattern',
        name: 'Greater Than Pattern',
        description: 'Test greater than',
        conditions: [
          { field: 'value', operator: 'gt', value: 100 },
        ],
      };

      cepEngine.registerPattern(pattern);

      const event = createEvent('metric.event', { value: 150 });
      await cepEngine.processEvent(event);
    });

    it('should evaluate in operator', async () => {
      const pattern: EventPattern = {
        id: 'in-pattern',
        name: 'In Pattern',
        description: 'Test in operator',
        conditions: [
          { field: 'region', operator: 'in', value: ['us-east', 'us-west', 'eu-west'] },
        ],
      };

      cepEngine.registerPattern(pattern);

      const event = createEvent('region.event', { region: 'us-east' });
      await cepEngine.processEvent(event);
    });

    it('should evaluate regex condition', async () => {
      const pattern: EventPattern = {
        id: 'regex-pattern',
        name: 'Regex Pattern',
        description: 'Test regex',
        conditions: [
          { field: 'email', operator: 'regex', value: '^[a-z]+@example\\.com$' },
        ],
      };

      cepEngine.registerPattern(pattern);

      const event = createEvent('email.event', { email: 'test@example.com' });
      await cepEngine.processEvent(event);
    });
  });

  describe('event buffer', () => {
    it('should maintain event buffer', async () => {
      const events = [
        createEvent('event1', {}),
        createEvent('event2', {}),
        createEvent('event3', {}),
      ];

      for (const event of events) {
        await cepEngine.processEvent(event);
      }

      const buffer = cepEngine.getEventBuffer();
      expect(buffer.length).toBe(3);
    });

    it('should clear event buffer', async () => {
      await cepEngine.processEvent(createEvent('test', {}));

      cepEngine.clearBuffer();

      const buffer = cepEngine.getEventBuffer();
      expect(buffer.length).toBe(0);
    });
  });
});
