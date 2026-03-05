import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { UsageMeteringService } from '../UsageMeteringService.js';

describe('UsageMeteringService', () => {
  let service: UsageMeteringService;

  beforeEach(() => {
    service = new UsageMeteringService();
  });

  it('should record a usage event', async () => {
    const event = {
      id: 'test-event-1',
      tenantId: 't1',
      dimension: 'custom',
      quantity: 10,
      unit: 'calls',
      source: 'test',
      occurredAt: new Date().toISOString(),
      recordedAt: new Date().toISOString()
    };

    await service.record(event);

    const events = await service.getEvents('t1');
    expect(events.length).toBe(1);
    expect(events[0].quantity).toBe(10);
    expect(events[0].tenantId).toBe('t1');
  });
});
