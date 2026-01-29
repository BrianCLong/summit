import { InMemoryProvenanceStore } from '../src/in_memory_store.js';
import { LineageEvent } from '../src/types.js';

describe('InMemoryProvenanceStore', () => {
  it('should store and retrieve events', async () => {
    const store = new InMemoryProvenanceStore();
    const event: LineageEvent = {
      event_id: 'evt-1',
      ts: new Date().toISOString(),
      actor: 'user-1',
      action: 'create',
      inputs: [],
      outputs: ['doc-1']
    };
    await store.putEvent(event);
    const lineage = await store.getLineage('doc-1');
    expect(lineage).toHaveLength(1);
    expect(lineage[0]).toEqual(event);
  });

  it('should order events by timestamp', async () => {
    const store = new InMemoryProvenanceStore();
    const event1: LineageEvent = {
      event_id: 'evt-1',
      ts: '2024-01-01T10:00:00Z',
      actor: 'user-1',
      action: 'create',
      inputs: [],
      outputs: ['doc-1']
    };
    const event2: LineageEvent = {
      event_id: 'evt-2',
      ts: '2024-01-01T11:00:00Z',
      actor: 'user-1',
      action: 'update',
      inputs: ['doc-1'],
      outputs: ['doc-1']
    };

    // Insert out of order
    await store.putEvent(event2);
    await store.putEvent(event1);

    const lineage = await store.getLineage('doc-1');
    expect(lineage).toHaveLength(2);
    expect(lineage[0].event_id).toBe('evt-1');
    expect(lineage[1].event_id).toBe('evt-2');
  });
});
