import { meteringPipeline } from '../../server/src/metering/pipeline.js';
import { MeterEventKind } from '../../server/src/metering/schema.js';
import { runTenantUsageRollup } from '../../server/src/jobs/tenant-usage-rollup.js';
import { tenantUsageDailyRepository } from '../../server/src/metering/repository.js';

describe('Metering pipeline', () => {
  beforeEach(() => {
    meteringPipeline.reset();
    tenantUsageDailyRepository.clear();
  });

  it('deduplicates events using idempotency key', async () => {
    const event = {
      kind: MeterEventKind.INGEST_UNITS,
      tenantId: 'acme',
      units: 5,
      source: 'test',
      idempotencyKey: 'abc123',
    };

    await meteringPipeline.enqueue(event);
    await meteringPipeline.enqueue(event);

    const rollups = meteringPipeline.getDailyRollups();
    expect(rollups).toHaveLength(1);
    expect(rollups[0].ingestUnits).toBe(5);
  });

  it('sends invalid events to DLQ and supports replay', async () => {
    await meteringPipeline.enqueue({
      kind: MeterEventKind.QUERY_CREDITS,
      tenantId: 'acme',
      credits: -1,
      source: 'test',
      correlationId: 'bad',
    });

    expect(meteringPipeline.getDailyRollups()).toHaveLength(0);
    expect(meteringPipeline.getDeadLetters()).toHaveLength(1);

    const replayResult = meteringPipeline.replayDLQ((event) => ({
      ...event,
      credits: Math.abs((event as any).credits),
    }));

    expect(replayResult.replayed).toBe(1);
    expect(meteringPipeline.getDeadLetters()).toHaveLength(0);
    const rollups = meteringPipeline.getDailyRollups();
    expect(rollups[0].queryCredits).toBe(1);
    expect(rollups[0].correlationIds).toContain('bad');
  });

  it('persists tenant_usage_daily rollups through the job', async () => {
    await meteringPipeline.enqueue({
      kind: MeterEventKind.STORAGE_BYTES_ESTIMATE,
      tenantId: 'acme',
      bytes: 1024,
      source: 'storage-test',
    });
    await meteringPipeline.enqueue({
      kind: MeterEventKind.USER_SEAT_ACTIVE,
      tenantId: 'acme',
      seatCount: 2,
      source: 'auth-test',
    });

    await runTenantUsageRollup();
    const rows = await tenantUsageDailyRepository.list();

    expect(rows).toHaveLength(1);
    expect(rows[0].storageBytesEstimate).toBe(1024);
    expect(rows[0].activeSeats).toBeGreaterThanOrEqual(2);
  });
});
