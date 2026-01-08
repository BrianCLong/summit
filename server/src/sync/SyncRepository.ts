
import { Pool, PoolClient } from 'pg';
import { VectorClock } from './VectorClock.js';
import { MergeEngine } from './MergeEngine.js';

export interface JournalEntry {
  opId: string;
  tenantId: string;
  deviceId: string;
  sessionId: string;
  objectType: string;
  objectId: string;
  payload: any;
  vectorClock: VectorClock;
  isTombstone: boolean;
  tombstoneVersion?: number;
  tags?: string[];
}

export interface SyncObject {
  tenantId: string;
  objectType: string;
  objectId: string;
  payload: any;
  vectorClock: VectorClock;
  isTombstone: boolean;
  lastModifiedAt: Date;
  tags?: string[];
}

export class SyncRepository {
  constructor(private pool: Pool) {}

  async ingestJournal(entries: JournalEntry[]): Promise<{ applied: number; conflicts: number }> {
    const client = await this.pool.connect();
    let appliedCount = 0;
    let conflictCount = 0;

    try {
      await client.query('BEGIN');

      for (const entry of entries) {
        // 1. Idempotency check in journal
        const exists = await client.query(
          'SELECT 1 FROM sync_journal WHERE op_id = $1',
          [entry.opId]
        );
        if (exists.rowCount && exists.rowCount > 0) continue;

        // 2. Insert into Journal
        await client.query(
          `INSERT INTO sync_journal
           (op_id, tenant_id, device_id, session_id, object_type, object_id, payload, vector_clock, tags)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [entry.opId, entry.tenantId, entry.deviceId, entry.sessionId, entry.objectType, entry.objectId, entry.payload, entry.vectorClock, entry.tags || []]
        );

        // 3. Fetch existing state
        const res = await client.query(
          `SELECT payload, vector_clock, is_tombstone, last_op_id, tags
           FROM sync_objects
           WHERE tenant_id = $1 AND object_type = $2 AND object_id = $3
           FOR UPDATE`,
          [entry.tenantId, entry.objectType, entry.objectId]
        );

        const existingState = res.rows[0] ? {
            payload: res.rows[0].payload,
            vectorClock: res.rows[0].vector_clock,
            isTombstone: res.rows[0].is_tombstone,
            lastOpId: res.rows[0].last_op_id,
            tags: res.rows[0].tags
        } : null;

        // 4. Merge
        const mergeResult = MergeEngine.merge(existingState, {
            payload: entry.payload,
            vectorClock: entry.vectorClock,
            isTombstone: entry.isTombstone
        });

        if (mergeResult.status === 'applied' || mergeResult.status === 'conflict') {
             // Merging tags: Union of existing tags + incoming tags? Or overwrite?
             // Usually overwrite if incoming is newer.
             // If conflict, we take winner's tags.
             const newTags = mergeResult.payload === entry.payload ? (entry.tags || []) : (existingState?.tags || []);

             let newLastOpId = existingState?.lastOpId || entry.opId;
             if (mergeResult.payload === entry.payload) {
                 newLastOpId = entry.opId;
             }

             await client.query(
                 `INSERT INTO sync_objects (tenant_id, object_type, object_id, payload, payload_hash, vector_clock, is_tombstone, last_modified_actor, last_modified_at, last_op_id, tags)
                  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), $9, $10)
                  ON CONFLICT (tenant_id, object_type, object_id)
                  DO UPDATE SET
                    payload = EXCLUDED.payload,
                    payload_hash = EXCLUDED.payload_hash,
                    vector_clock = EXCLUDED.vector_clock,
                    is_tombstone = EXCLUDED.is_tombstone,
                    last_modified_at = NOW(),
                    last_op_id = EXCLUDED.last_op_id,
                    tags = EXCLUDED.tags`,
                 [
                     entry.tenantId,
                     entry.objectType,
                     entry.objectId,
                     mergeResult.payload,
                     'hash_placeholder',
                     mergeResult.vectorClock,
                     mergeResult.isTombstone,
                     entry.deviceId,
                     newLastOpId,
                     newTags
                 ]
             );
             appliedCount++;
        }

        if (mergeResult.status === 'conflict') {
            conflictCount++;

            const winningOpId = mergeResult.payload === entry.payload ? entry.opId : (existingState?.lastOpId || '00000000-0000-0000-0000-000000000000');
            const losingOpId = mergeResult.payload === entry.payload ? (existingState?.lastOpId || '00000000-0000-0000-0000-000000000000') : entry.opId;

            await client.query(
                `INSERT INTO sync_conflicts
                (tenant_id, object_type, object_id, op_ids, winning_op_id, losing_op_id, winning_vector_clock, losing_vector_clock, reason_code)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
                [
                    entry.tenantId,
                    entry.objectType,
                    entry.objectId,
                    [entry.opId],
                    winningOpId,
                    losingOpId,
                    mergeResult.vectorClock,
                    entry.vectorClock,
                    mergeResult.conflictReason
                ]
            );
        }
      }

      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
    return { applied: appliedCount, conflicts: conflictCount };
  }

  async pull(
      tenantId: string,
      scope: { types?: string[]; ids?: string[]; tags?: string[]; timeRange?: { start: Date; end: Date } },
      sinceCursor: number,
      limit: number
  ): Promise<{ objects: SyncObject[], maxId: number }> {
      const client = await this.pool.connect();
      try {
          // 1. Scan Journal for updates > cursor AND matches scope
          let query = `
            SELECT id, object_type, object_id
            FROM sync_journal
            WHERE tenant_id = $1 AND id > $2
          `;
          const params: any[] = [tenantId, sinceCursor];
          let pIdx = 3;

          if (scope.types && scope.types.length > 0) {
              query += ` AND object_type = ANY($${pIdx})`;
              params.push(scope.types);
              pIdx++;
          }
           if (scope.ids && scope.ids.length > 0) {
              query += ` AND object_id = ANY($${pIdx})`;
              params.push(scope.ids);
              pIdx++;
          }
          if (scope.tags && scope.tags.length > 0) {
              query += ` AND tags && $${pIdx}`; // Postgres array overlap
              params.push(scope.tags);
              pIdx++;
          }
          // Note: timeRange usually applies to object modified time, but here we are scanning journal.
          // Applying timeRange to JOURNAL timestamp.
          if (scope.timeRange) {
              if (scope.timeRange.start) {
                  query += ` AND timestamp >= $${pIdx}`;
                  params.push(scope.timeRange.start);
                  pIdx++;
              }
              if (scope.timeRange.end) {
                  query += ` AND timestamp <= $${pIdx}`;
                  params.push(scope.timeRange.end);
                  pIdx++;
              }
          }

          query += ` ORDER BY id ASC LIMIT $${pIdx}`;
          params.push(limit);

          const res = await client.query(query, params);
          if (res.rows.length === 0) {
              return { objects: [], maxId: sinceCursor };
          }

          const maxId = parseInt(res.rows[res.rows.length - 1].id);

          // 2. Dedup
          const keys = new Map<string, { type: string, id: string }>();
          for (const row of res.rows) {
              const key = `${row.object_type}:${row.object_id}`;
              keys.set(key, { type: row.object_type, id: row.object_id });
          }

          if (keys.size === 0) {
               return { objects: [], maxId };
          }

          // 3. Fetch materialized state
          const tuples = Array.from(keys.values());
          const tupleParams: any[] = [tenantId];
          // tenantId is $1
          // first tuple: $1, $2, $3
          // second tuple: $1, $4, $5
          const tuplePlaceholders = tuples.map((_, i) => `($1, $${i * 2 + 2}, $${i * 2 + 3})`).join(', ');

          tuples.forEach(t => {
              tupleParams.push(t.type);
              tupleParams.push(t.id);
          });

          const objQuery = `
            SELECT * FROM sync_objects
            WHERE tenant_id = $1 AND (tenant_id, object_type, object_id) IN (${tuplePlaceholders})
          `;

          const objRes = await client.query(objQuery, tupleParams);

          const objects = objRes.rows.map(row => ({
              tenantId: row.tenant_id,
              objectType: row.object_type,
              objectId: row.object_id,
              payload: row.payload,
              vectorClock: row.vector_clock,
              isTombstone: row.is_tombstone,
              lastModifiedAt: row.last_modified_at,
              tags: row.tags
          }));

          return { objects, maxId };

      } finally {
          client.release();
      }
  }
}
