"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const PostgresStore_js_1 = require("../server/src/orchestrator/PostgresStore.js");
const uuid_1 = require("uuid");
const postgres_js_1 = require("../server/src/db/postgres.js");
const PartitionManager_js_1 = require("../server/src/orchestrator/PartitionManager.js");
const vitest_1 = require("vitest");
(0, vitest_1.describe)('Orchestrator Partitioning Phase B (Dual-Write)', () => {
    let pool;
    let store;
    let partitionManager;
    let tenantId = (0, uuid_1.v4)();
    (0, vitest_1.beforeAll)(async () => {
        pool = (0, postgres_js_1.getPostgresPool)().pool;
        store = new PostgresStore_js_1.PostgresStore(pool);
        partitionManager = new PartitionManager_js_1.PartitionManager(pool);
        // Ensure partitions exist for test
        await partitionManager.ensurePartitions();
    });
    (0, vitest_1.it)('should dual-write events to both legacy and partitioned tables', async () => {
        const runId = (0, uuid_1.v4)();
        const taskId = (0, uuid_1.v4)();
        // Create run and task in legacy tables (they aren't partitioned yet in this phase)
        await pool.query('INSERT INTO orchestrator_runs (id, tenant_id, status) VALUES ($1, $2, $3)', [runId, tenantId, 'running']);
        await pool.query('INSERT INTO orchestrator_tasks (id, run_id, tenant_id, name, kind, status) VALUES ($1, $2, $3, $4, $5, $6)', [taskId, runId, tenantId, 'test task', 'ping', 'running']);
        // Complete task (triggers dual-write)
        // We pass workerId 'test-worker' and version 1. In our restored store,
        // completeTask expects taskId, workerId, version, result.
        await store.completeTask(taskId, 'test-worker', 1, { success: true });
        // Verify legacy table
        const legacyRes = await pool.query('SELECT * FROM orchestrator_events WHERE task_id = $1', [taskId]);
        (0, vitest_1.expect)(legacyRes.rows.length).toBe(1);
        (0, vitest_1.expect)(legacyRes.rows[0].type).toBe('task_completed');
        // Verify partitioned table (Phase B)
        const partRes = await pool.query('SELECT * FROM orchestrator_events_p WHERE task_id = $1', [taskId]);
        (0, vitest_1.expect)(partRes.rows.length).toBe(1);
        (0, vitest_1.expect)(partRes.rows[0].type).toBe('task_completed');
        // Verify it landed in the correct partition
        const detailRes = await pool.query('SELECT tableoid::regclass AS part_name FROM orchestrator_events_p WHERE task_id = $1', [taskId]);
        (0, vitest_1.expect)(detailRes.rows[0].part_name).toMatch(/orchestrator_events_\d{4}_\d{2}/);
    });
    (0, vitest_1.it)('should dual-write outbox to both legacy and partitioned tables', async () => {
        const client = await pool.connect();
        try {
            await store.insertOutbox(client, {
                tenant_id: tenantId,
                event_type: 'test.event',
                payload: { foo: 'bar' }
            });
            // Verify legacy
            const legacyRes = await pool.query('SELECT * FROM orchestrator_outbox WHERE tenant_id = $1', [tenantId]);
            (0, vitest_1.expect)(legacyRes.rows.length).toBe(1);
            // Verify partitioned
            const partRes = await pool.query('SELECT * FROM orchestrator_outbox_p WHERE tenant_id = $1', [tenantId]);
            (0, vitest_1.expect)(partRes.rows.length).toBe(1);
        }
        finally {
            client.release();
        }
    });
});
