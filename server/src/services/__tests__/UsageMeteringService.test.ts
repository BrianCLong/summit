import { describe, it, expect, beforeEach } from '@jest/globals';
import { UsageMeteringService } from '../UsageMeteringService.js';

describe('UsageMeteringService', () => {
  let service: UsageMeteringService;

  beforeEach(() => {
    service = new UsageMeteringService();
  });

  it('should record a usage event', async () => {
    await service.record({
      id: '1',
      tenantId: 't1',
      dimension: 'api_calls',
      quantity: 10,
      unit: 'calls',
      source: 'test',
      occurredAt: new Date().toISOString(),
      recordedAt: new Date().toISOString()
    });

    const events = await service.getEvents('t1');
    expect(events).toHaveLength(1);
    expect(events[0].quantity).toBe(10);
  });

  it('should aggregate events', async () => {
    const now = new Date().toISOString();
    await service.record({
      id: '1',
      tenantId: 't1',
      dimension: 'api_calls',
      quantity: 10,
      unit: 'calls',
      source: 'test',
      occurredAt: now,
      recordedAt: now
    });
    await service.record({
      id: '2',
      tenantId: 't1',
      dimension: 'api_calls',
      quantity: 5,
      unit: 'calls',
      source: 'test',
      occurredAt: now,
      recordedAt: now
    });

    const aggregation = await service.getAggregation('t1', 'api_calls', new Date(Date.now() - 10000).toISOString(), new Date(Date.now() + 10000).toISOString());
    expect(aggregation.totalQuantity).toBe(15);
    expect(aggregation.eventCount).toBe(2);
  });
});
