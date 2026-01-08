
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { SyncRepository } from '../../src/sync/SyncRepository.js';
import { VectorClock } from '../../src/sync/VectorClock.js';

// In-memory DB simulation for Integration Test
class InMemoryDB {
    journal: any[] = [];
    objects: Map<string, any> = new Map();
    conflicts: any[] = [];

    getKey(tenantId: string, type: string, id: string) {
        return `${tenantId}:${type}:${id}`;
    }
}

class MockPoolClient {
    constructor(private db: InMemoryDB) {}

    async query(text: string, params: any[] = []) {
        // Normalize text for easier matching (remove newlines, extra spaces)
        const normalizedText = text.replace(/\s+/g, ' ').trim();

        if (normalizedText === 'BEGIN' || normalizedText === 'COMMIT' || normalizedText === 'ROLLBACK') return;

        // INSERT INTO sync_journal
        if (normalizedText.includes('INSERT INTO sync_journal')) {
             const [opId, tenantId, deviceId, sessionId, objectType, objectId, payload, vectorClock] = params;
             this.db.journal.push({ opId, tenantId, deviceId, sessionId, objectType, objectId, payload, vectorClock, id: this.db.journal.length + 1 });
             return { rowCount: 1 };
        }

        // SELECT 1 FROM sync_journal
        if (normalizedText.includes('SELECT 1 FROM sync_journal')) {
            const opId = params[0];
            const found = this.db.journal.find(j => j.opId === opId);
            return { rowCount: found ? 1 : 0 };
        }

        // SELECT ... FROM sync_objects FOR UPDATE
        if (normalizedText.includes('SELECT payload, vector_clock, is_tombstone, last_op_id, tags FROM sync_objects')) {
             const [tenantId, objectType, objectId] = params;
             const key = this.db.getKey(tenantId, objectType, objectId);
             const obj = this.db.objects.get(key);
             if (obj) {
                 return { rows: [{
                     payload: obj.payload,
                     vector_clock: obj.vectorClock,
                     is_tombstone: obj.isTombstone,
                     last_op_id: obj.lastOpId,
                     tags: obj.tags
                 }] };
             }
             return { rows: [] };
        }

        // INSERT INTO sync_objects
        if (normalizedText.includes('INSERT INTO sync_objects')) {
            const [tenantId, objectType, objectId, payload, hash, vectorClock, isTombstone, deviceId, lastOpId, tags] = params;
            const key = this.db.getKey(tenantId, objectType, objectId);
            this.db.objects.set(key, { tenantId, objectType, objectId, payload, vectorClock, isTombstone, lastOpId, tags });
            return { rowCount: 1 };
        }

        // INSERT INTO sync_conflicts
        if (normalizedText.includes('INSERT INTO sync_conflicts')) {
            const [tenantId, objectType, objectId, opIds, winningOpId, losingOpId, winningVectorClock, losingVectorClock, reasonCode] = params;
            this.db.conflicts.push({ tenantId, objectType, objectId, opIds, winningOpId, losingOpId, reasonCode });
            return { rowCount: 1 };
        }

        // PULL: 1. SELECT id, object_type, object_id FROM sync_journal
        if (normalizedText.includes('SELECT id, object_type, object_id FROM sync_journal')) {
             const [tenantId, sinceCursor] = params;
             // Scope logic check (basic)
             // We return items that match cursor
             const res = this.db.journal
                .filter(j => j.tenantId === tenantId && j.id > sinceCursor)
                .map(j => ({ id: j.id.toString(), object_type: j.objectType, object_id: j.objectId }));
             return { rows: res };
        }

        // PULL: 2. SELECT * FROM sync_objects WHERE ... IN ...
        if (normalizedText.includes('SELECT * FROM sync_objects')) {
             // Verify correct parameter binding for tuple
             // Should contain ($1, $2, $3) pattern
             if (!normalizedText.includes('($1, $2, $3)')) {
                 throw new Error('Invalid SQL parameter binding generation in pull query');
             }

             const [tenantId] = params;
             const res = Array.from(this.db.objects.values())
                .filter(o => o.tenantId === tenantId)
                .map(o => ({
                    tenant_id: o.tenantId,
                    object_type: o.objectType,
                    object_id: o.objectId,
                    payload: o.payload,
                    vector_clock: o.vectorClock,
                    is_tombstone: o.isTombstone,
                    last_modified_at: new Date(),
                    tags: o.tags,
                    last_op_id: o.lastOpId
                }));
             return { rows: res };
        }

        return { rows: [] };
    }

    release() {}
}

class MockPool {
    constructor(private db: InMemoryDB) {}
    async connect() { return new MockPoolClient(this.db); }
}

describe('Sync Integration Scenarios', () => {

    it('Scenario: Two devices diverge, push journals, server resolves conflict', async () => {
        const db = new InMemoryDB();
        const pool = new MockPool(db) as any;
        const repo = new SyncRepository(pool);
        const tenantId = 'tenant-1';
        const docId = 'doc-A';

        // Initial State
        await repo.ingestJournal([{
            opId: 'op-1',
            tenantId,
            deviceId: 'dev-A',
            sessionId: 'sess-A',
            objectType: 'doc',
            objectId: docId,
            payload: { text: 'Version 1' },
            vectorClock: { 'dev-A': 1 },
            isTombstone: false
        }]);

        // Device A update
        const op2A = {
            opId: 'op-2a',
            tenantId,
            deviceId: 'dev-A',
            sessionId: 'sess-A',
            objectType: 'doc',
            objectId: docId,
            payload: { text: 'Version 2A' },
            vectorClock: { 'dev-A': 2 },
            isTombstone: false
        };

        // Device B update (Concurrent)
        const op2B = {
            opId: 'op-2b',
            tenantId,
            deviceId: 'dev-B',
            sessionId: 'sess-B',
            objectType: 'doc',
            objectId: docId,
            payload: { text: 'Version 2B' },
            vectorClock: { 'dev-A': 1, 'dev-B': 1 },
            isTombstone: false
        };

        // Push B
        await repo.ingestJournal([op2B]);

        let state = db.objects.get(db.getKey(tenantId, 'doc', docId));
        assert.deepStrictEqual(state.payload, { text: 'Version 2B' });

        // Push A (Concurrent)
        await repo.ingestJournal([op2A]);

        state = db.objects.get(db.getKey(tenantId, 'doc', docId));
        assert.deepStrictEqual(state.payload, { text: 'Version 2B' });

        // Conflict recorded
        assert.strictEqual(db.conflicts.length, 1);
        const conflict = db.conflicts[0];
        assert.strictEqual(conflict.reasonCode, 'CONCURRENT_UPDATE');
        assert.strictEqual(conflict.winningOpId, 'op-2b');
        assert.strictEqual(conflict.losingOpId, 'op-2a');

        const pullResult = await repo.pull(tenantId, { ids: [docId] }, 0, 100);
        const serverObj = pullResult.objects[0];
        assert.deepStrictEqual(serverObj.payload, { text: 'Version 2B' });

        // Merged clock check: { dev-A: 2, dev-B: 1 }
        assert.deepStrictEqual(serverObj.vectorClock, { 'dev-A': 2, 'dev-B': 1 });
    });
});
