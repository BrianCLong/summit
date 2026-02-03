import { Pool } from 'pg';
import { PostgresStore } from '../server/src/orchestrator/PostgresStore.js';
import { v4 as uuidv4 } from 'uuid';
import { getPostgresPool } from '../server/src/db/postgres.js';
import { PartitionManager } from '../server/src/orchestrator/PartitionManager.js';
import { describe, it, expect, beforeAll } from 'vitest';

describe('Orchestrator Partitioning Phase B (Dual-Write)', () => {
    let pool: Pool;
    let store: PostgresStore;
    let partitionManager: PartitionManager;
    let tenantId = uuidv4();

    beforeAll(async () => {
        pool = getPostgresPool().pool;
        store = new PostgresStore(pool);
        partitionManager = new PartitionManager(pool);

        // Ensure partitions exist for test
        await partitionManager.ensurePartitions();
    });

    it('should dual-write events to both legacy and partitioned tables', async () => {
        const runId = uuidv4();
        const taskId = uuidv4();

        // Create run and task in legacy tables (they aren't partitioned yet in this phase)
        await pool.query('INSERT INTO orchestrator_runs (id, tenant_id, status) VALUES ($1, $2, $3)', [runId, tenantId, 'running']);
        await pool.query('INSERT INTO orchestrator_tasks (id, run_id, tenant_id, name, kind, status) VALUES ($1, $2, $3, $4, $5, $6)',
            [taskId, runId, tenantId, 'test task', 'ping', 'running']);

        // Complete task (triggers dual-write)
        // We pass workerId 'test-worker' and version 1. In our restored store,
        // completeTask expects taskId, workerId, version, result.
        await store.completeTask(taskId, 'test-worker', 1, { success: true });

        // Verify legacy table
        const legacyRes = await pool.query('SELECT * FROM orchestrator_events WHERE task_id = $1', [taskId]);
        expect(legacyRes.rows.length).toBe(1);
        expect(legacyRes.rows[0].type).toBe('task_completed');

        // Verify partitioned table (Phase B)
        const partRes = await pool.query('SELECT * FROM orchestrator_events_p WHERE task_id = $1', [taskId]);
        expect(partRes.rows.length).toBe(1);
        expect(partRes.rows[0].type).toBe('task_completed');

        // Verify it landed in the correct partition
        const detailRes = await pool.query('SELECT tableoid::regclass AS part_name FROM orchestrator_events_p WHERE task_id = $1', [taskId]);
        expect(detailRes.rows[0].part_name).toMatch(/orchestrator_events_\d{4}_\d{2}/);
    });

    it('should dual-write outbox to both legacy and partitioned tables', async () => {
        const client = await pool.connect();
        try {
            await store.insertOutbox(client, {
                tenant_id: tenantId,
                event_type: 'test.event',
                payload: { foo: 'bar' }
            });

            // Verify legacy
            const legacyRes = await pool.query('SELECT * FROM orchestrator_outbox WHERE tenant_id = $1', [tenantId]);
            expect(legacyRes.rows.length).toBe(1);

            // Verify partitioned
            const partRes = await pool.query('SELECT * FROM orchestrator_outbox_p WHERE tenant_id = $1', [tenantId]);
            expect(partRes.rows.length).toBe(1);
        } finally {
            client.release();
        }
    });
});
