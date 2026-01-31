import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PostgresStore } from '../PostgresStore.js';
import { OrchestratorWorker } from '../OrchestratorWorker.js';
import { Task } from '@summit/orchestrator';
import { getPostgresPool } from '../../db/postgres.js';

describe('Orchestrator Adversarial Tests', () => {
    let store: PostgresStore;
    const pool = getPostgresPool();

    beforeEach(async () => {
        store = new PostgresStore(pool);
        // Cleanup tables before each test
        await pool.query('DELETE FROM orchestrator_tasks');
        await pool.query('DELETE FROM orchestrator_runs');
        await pool.query('DELETE FROM orchestrator_outbox');
    });

    it('Concurrent workers - only one should claim a task', async () => {
        const runId = 'run-1';
        await store.saveRun(runId, {});
        await store.upsertTask({
            id: 'task-1',
            runId,
            subject: 'test',
            status: 'pending',
            blockedBy: [],
            blocks: [],
            attempts: 0,
            maxAttempts: 3,
            readyAt: new Date().toISOString(),
            priority: 0,
            version: 1,
            timestamps: { created: new Date().toISOString() }
        });

        const worker1 = new OrchestratorWorker(store);
        const worker2 = new OrchestratorWorker(store);

        // Try to claim simultaneously
        const [claim1, claim2] = await Promise.all([
            store.claimTask('worker-1', 10000),
            store.claimTask('worker-2', 10000)
        ]);

        // One should succeed, the other should be undefined
        const successes = [claim1, claim2].filter(t => t !== undefined);
        expect(successes).toHaveLength(1);
        expect(['worker-1', 'worker-2']).toContain(successes[0]!.id === 'task-1' ? successes[0]!.id : '');
        // Wait, the row has 'claimed_by' which we don't return in the task object currently.
        // But we know only one should return a Task object.
    });

    it('Lease expiration - second worker should reclaim task', async () => {
        const runId = 'run-2';
        await store.saveRun(runId, {});
        await store.upsertTask({
            id: 'task-2',
            runId,
            subject: 'test',
            status: 'pending',
            blockedBy: [],
            blocks: [],
            attempts: 0,
            maxAttempts: 3,
            readyAt: new Date().toISOString(),
            priority: 0,
            version: 1,
            timestamps: { created: new Date().toISOString() }
        });

        // Claim with very short lease
        const task = await store.claimTask('worker-1', 1); // 1ms lease
        expect(task).toBeDefined();

        // Sleep to let lease expire
        await new Promise(resolve => setTimeout(resolve, 5));

        // Second worker should be able to claim it
        const reclaimedTask = await store.claimTask('worker-2', 10000);
        expect(reclaimedTask).toBeDefined();
        expect(reclaimedTask?.id).toBe('task-2');
        expect(reclaimedTask?.attempts).toBe(2);
    });

    it('Optimistic Locking - first worker should fail completion if task was reclaimed', async () => {
        const runId = 'run-3';
        await store.saveRun(runId, {});
        await store.upsertTask({
            id: 'task-3',
            runId,
            subject: 'test',
            status: 'pending',
            blockedBy: [],
            blocks: [],
            attempts: 0,
            maxAttempts: 3,
            readyAt: new Date().toISOString(),
            priority: 0,
            version: 1,
            timestamps: { created: new Date().toISOString() }
        });

        // Worker 1 claims
        const taskW1 = await store.claimTask('worker-1', 1);

        // Lease expires, Worker 2 reclaims (version increments)
        await new Promise(resolve => setTimeout(resolve, 5));
        const taskW2 = await store.claimTask('worker-2', 10000);

        expect(taskW2?.version).toBeGreaterThan(taskW1!.version);

        // Worker 1 tries to complete with stale version
        await expect(store.updateTaskStatus('task-3', 'completed', {
            expectedVersion: taskW1!.version + 1
        })).rejects.toThrow(/Optimistic locking failure/);
    });

    it('Outbox Atomicity - items only visible after commit', async () => {
        const runId = 'run-4';
        await store.saveRun(runId, {});

        // Using withTransaction to simulate atomic completion
        try {
            await store.withTransaction(async (tx) => {
                await tx.saveToOutbox('test-topic', { data: 'test' });

                // Inside transaction, outbox might have it (if using same client)
                // But outside it should NOT be visible yet
                const { rows } = await pool.query('SELECT count(*) FROM orchestrator_outbox');
                expect(parseInt(rows[0].count)).toBe(0);

                // This throw simulates a failure before bit commit
                throw new Error('Rollback please');
            });
        } catch (e: any) {
            expect(e.message).toBe('Rollback please');
        }

        // After rollback, still 0
        const { rows: finalRows } = await pool.query('SELECT count(*) FROM orchestrator_outbox');
        expect(parseInt(finalRows[0].count)).toBe(0);
    });
});
