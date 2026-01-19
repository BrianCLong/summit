import { describe, it, expect, vi } from 'vitest';
import { pollOutboxChanges } from '../src/capture/triggers.js';
import { OutboxCursor } from '../src/capture/types.js';

describe('outboxPoller', () => {
  it('should poll changes from outbox and advance cursor', async () => {
    const mockClient = {
      query: vi.fn().mockResolvedValue({
        rows: [
          { id: 1, table_name: 'accounts', op: 'INSERT', pk: { id: 1 }, after: { id: 1, name: 'Alice' } },
          { id: 2, table_name: 'accounts', op: 'UPDATE', pk: { id: 1 }, before: { id: 1, name: 'Alice' }, after: { id: 1, name: 'Bob' } }
        ]
      })
    };

    const cursor: OutboxCursor = { kind: 'outbox', last_id: 0 };
    const result = await pollOutboxChanges(mockClient as any, cursor);

    expect(result.events).toHaveLength(2);
    expect(result.events[0].id).toBe(1);
    expect(result.events[1].id).toBe(2);
    expect(result.nextCursor).toEqual({ kind: 'outbox', last_id: 2 });

    expect(mockClient.query).toHaveBeenCalledWith(
      expect.stringContaining('SELECT id, table_name, op, pk, before, after FROM graph_guard_outbox'),
      [0, 100]
    );
  });

  it('should return empty events and same cursor if no new rows', async () => {
    const mockClient = {
      query: vi.fn().mockResolvedValue({ rows: [] })
    };

    const cursor: OutboxCursor = { kind: 'outbox', last_id: 10 };
    const result = await pollOutboxChanges(mockClient as any, cursor);

    expect(result.events).toHaveLength(0);
    expect(result.nextCursor).toEqual({ kind: 'outbox', last_id: 10 });
  });
});
