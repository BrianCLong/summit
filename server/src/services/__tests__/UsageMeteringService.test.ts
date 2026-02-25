import { describe, it, expect, beforeEach } from '@jest/globals';
import { UsageMeteringService } from '../UsageMeteringService.js';

describe('UsageMeteringService', () => {
  let service: UsageMeteringService;

  beforeEach(() => {
    service = new UsageMeteringService();
  });

  it('records usage events and auto-generates ids when missing', async () => {
    const now = new Date('2026-01-01T00:00:00.000Z').toISOString();

    await service.record({
      id: '',
      tenantId: 't1',
      dimension: 'custom',
      quantity: 10,
      unit: 'calls',
      source: 'unit-test',
      occurredAt: now,
      recordedAt: now,
    });

    const events = await service.getEvents('t1', { dimension: 'custom' });
    expect(events).toHaveLength(1);
    expect(events[0].id).toMatch(/^usage_/);
    expect(events[0].quantity).toBe(10);
  });

  it('aggregates usage totals within a time range', async () => {
    const jan1 = new Date('2026-01-01T00:00:00.000Z').toISOString();
    const jan2 = new Date('2026-01-02T00:00:00.000Z').toISOString();
    const jan3 = new Date('2026-01-03T00:00:00.000Z').toISOString();

    await service.record({
      id: 'evt1',
      tenantId: 't1',
      dimension: 'custom',
      quantity: 1,
      unit: 'calls',
      source: 'unit-test',
      occurredAt: jan1,
      recordedAt: jan1,
    });

    await service.record({
      id: 'evt2',
      tenantId: 't1',
      dimension: 'custom',
      quantity: 2,
      unit: 'calls',
      source: 'unit-test',
      occurredAt: jan2,
      recordedAt: jan2,
    });

    await service.record({
      id: 'evt3',
      tenantId: 't1',
      dimension: 'other',
      quantity: 100,
      unit: 'calls',
      source: 'unit-test',
      occurredAt: jan2,
      recordedAt: jan2,
    });

    const aggregation = await service.getAggregation('t1', 'custom', jan1, jan3);
    expect(aggregation.totalQuantity).toBe(3);
    expect(aggregation.eventCount).toBe(2);
  });
});
