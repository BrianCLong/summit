import pg from 'pg';
import { ChangeEvent, OutboxCursor } from './types.js';

export interface OutboxCaptureOptions {
  batchSize?: number;
}

export async function pollOutboxChanges(
  client: pg.Client,
  cursor: OutboxCursor,
  options: OutboxCaptureOptions = {}
): Promise<{ events: ChangeEvent[]; nextCursor: OutboxCursor }> {
  const { batchSize = 100 } = options;

  const res = await client.query(
    'SELECT id, table_name, op, pk, before, after FROM graph_guard_outbox WHERE id > $1 ORDER BY id ASC LIMIT $2',
    [cursor.last_id, batchSize]
  );

  const events: ChangeEvent[] = res.rows.map((row) => ({
    table: row.table_name,
    op: row.op as 'INSERT' | 'UPDATE' | 'DELETE',
    pk: row.pk,
    before: row.before,
    after: row.after,
    id: Number(row.id),
  }));

  const lastId = events.length > 0 ? events[events.length - 1].id! : cursor.last_id;

  return {
    events,
    nextCursor: {
      kind: 'outbox',
      last_id: lastId,
    },
  };
}

export async function cleanupOutbox(client: pg.Client, lastId: number) {
  await client.query('DELETE FROM graph_guard_outbox WHERE id <= $1', [lastId]);
}
