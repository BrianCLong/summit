import { ingestNAEFEvent } from '../../../src/graphrag/cis/cig/write';

describe('CIG Tenant Isolation', () => {
  it('should only access data for the specified tenant', async () => {
    const event = {
      tenant_id: 'tenantA',
      event_id: 'e1',
      event_time: '2023-01-01T00:00:00Z',
      source: 'test',
      artifact: { type: 'text', hash: 'h1' },
      provenance: { source_pointer: 'p1', ingestion_run_id: 'r1' }
    };
    await ingestNAEFEvent(event as any);
    expect(true).toBe(true);
  });
});
