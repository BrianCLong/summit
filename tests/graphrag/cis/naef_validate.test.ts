import { validateNAEFEvent } from '../../../src/graphrag/cis/naef/validate';

describe('NAEF Validation', () => {
  it('validates a correct event', () => {
    const event = {
      tenant_id: 't1',
      event_id: 'e1',
      event_time: '2023-01-01T00:00:00Z',
      source: 'test',
      artifact: { type: 'text', hash: 'h1' },
      provenance: { source_pointer: 'p1', ingestion_run_id: 'r1' }
    };
    const result = validateNAEFEvent(event);
    expect(result.valid).toBe(true);
  });

  it('rejects invalid event (missing required field)', () => {
    const event = {
      tenant_id: 't1',
      // missing event_id
      event_time: '2023-01-01T00:00:00Z',
      source: 'test',
      artifact: { type: 'text', hash: 'h1' },
      provenance: { source_pointer: 'p1', ingestion_run_id: 'r1' }
    };
    const result = validateNAEFEvent(event);
    expect(result.valid).toBe(false);
  });
});
