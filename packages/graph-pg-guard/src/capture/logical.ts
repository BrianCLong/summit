import pg from 'pg';
import { ChangeEvent, WALCursor } from './types.js';

export interface LogicalCaptureOptions {
  slotName: string;
  batchSize?: number;
}

export async function pollLogicalChanges(
  client: pg.Client,
  options: LogicalCaptureOptions,
  cursor: WALCursor
): Promise<{ events: ChangeEvent[]; nextCursor: WALCursor }> {
  const { slotName, batchSize = 100 } = options;

  // We use pg_logical_slot_get_changes to consume changes.
  // format: pg_logical_slot_get_changes(slot_name name, upto_lsn pg_lsn, upto_nchanges integer, VARIADIC options text[])
  const res = await client.query(
    'SELECT lsn, data FROM pg_logical_slot_get_changes($1, NULL, $2, \'pretty-print\', \'1\', \'include-pk\', \'1\')',
    [slotName, batchSize]
  );

  const events: ChangeEvent[] = [];
  let lastLsn = cursor.lsn;

  for (const row of res.rows) {
    const data = JSON.parse(row.data);
    lastLsn = row.lsn;

    if (data.change) {
      for (const change of data.change) {
        const event = transformWal2JsonChange(change, row.lsn);
        if (event) {
          events.push(event);
        }
      }
    }
  }

  return {
    events,
    nextCursor: {
      kind: 'wal',
      slot: slotName,
      lsn: lastLsn,
    },
  };
}

export function transformWal2JsonChange(change: any, lsn: string): ChangeEvent | null {
  const table = change.table;
  const opMap: Record<string, 'INSERT' | 'UPDATE' | 'DELETE'> = {
    insert: 'INSERT',
    update: 'UPDATE',
    delete: 'DELETE',
  };

  const op = opMap[change.kind];
  if (!op) return null;

  const pk: Record<string, any> = {};
  const before: Record<string, any> = {};
  const after: Record<string, any> = {};

  if (change.pk) {
    for (let i = 0; i < change.pk.pknames.length; i++) {
      pk[change.pk.pknames[i]] = change.pk.pkvalues[i];
    }
  }

  if (change.kind === 'insert' || change.kind === 'update') {
    for (let i = 0; i < change.columnnames.length; i++) {
      after[change.columnnames[i]] = change.columnvalues[i];
    }
  }

  if (change.kind === 'delete' || change.kind === 'update') {
    if (change.oldkeys) {
      for (let i = 0; i < change.oldkeys.keynames.length; i++) {
        before[change.oldkeys.keynames[i]] = change.oldkeys.keyvalues[i];
      }
    }
  }

  return {
    table,
    op,
    pk,
    before: Object.keys(before).length > 0 ? before : null,
    after: Object.keys(after).length > 0 ? after : null,
    lsn,
  };
}

export async function ensureReplicationSlot(client: pg.Client, slotName: string) {
  const res = await client.query(
    'SELECT 1 FROM pg_replication_slots WHERE slot_name = $1',
    [slotName]
  );

  if (res.rowCount === 0) {
    await client.query(
      'SELECT pg_create_logical_replication_slot($1, \'wal2json\')',
      [slotName]
    );
  }
}
