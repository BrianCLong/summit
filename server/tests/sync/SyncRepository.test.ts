
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { Pool } from 'pg';
import { SyncRepository } from '../../src/sync/SyncRepository.js';
import crypto from 'crypto';

// Setup Mock Pool
class MockPool {
    async connect() {
        return {
            query: async (text: string, params: any[]) => {
               // Mock implementation
               if (text.includes('BEGIN') || text.includes('COMMIT') || text.includes('ROLLBACK')) return;

               if (text.includes('SELECT 1 FROM sync_journal')) {
                   return { rowCount: 0 }; // Not exists
               }

               if (text.includes('INSERT INTO sync_journal')) {
                   return { rowCount: 1 };
               }

               if (text.includes('SELECT payload')) {
                   return { rows: [] }; // No existing state
               }

               if (text.includes('INSERT INTO sync_objects')) {
                   return { rowCount: 1 };
               }

               return { rows: [] };
            },
            release: () => {}
        }
    }
}

describe('SyncRepository (Mocked)', () => {
  it('should ingest journal entries', async () => {
    const pool = new MockPool() as any as Pool;
    const repo = new SyncRepository(pool);

    const entry = {
        opId: crypto.randomUUID(),
        tenantId: crypto.randomUUID(),
        deviceId: 'dev1',
        sessionId: 'sess1',
        objectType: 'note',
        objectId: 'note1',
        payload: { text: 'hello' },
        vectorClock: { dev1: 1 },
        isTombstone: false
    };

    const result = await repo.ingestJournal([entry]);
    assert.strictEqual(result.applied, 1);
    assert.strictEqual(result.conflicts, 0);
  });
});
