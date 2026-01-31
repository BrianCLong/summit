import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PostgresStore } from '../src/orchestrator/PostgresStore.js';
import { getPostgresPool } from '../src/db/postgres.js';
import { Task } from '@summit/orchestrator';

describe('PostgresStore Integration', () => {
    let store: PostgresStore;
    const pool = getPostgresPool();

    beforeAll(async () => {
        store = new PostgresStore();
        // Ensure migrations are run or tables exist
        // In this environment we assume tables are created by the migration implementation
    });

    afterAll(async () => {
        await pool.query('DELETE FROM orchestrator_outbox');
        await pool.query('DELETE FROM orchestrator_events');
        await pool.query('DELETE FROM orchestrator_tasks');
        await pool.query('DELETE FROM orchestrator_runs');
    });

    it('should create a run and upsert tasks idempotently', async () => {
        const runId = 'test-run-' + Date.now();
        await store.createRun(runId, { test: true });

        const task: Task = {
            id: 'task-1',
            subject: 'Test Task',
            status: 'pending',
            blockedBy: [],
            blocks: [],
            timestamps: { created: new Date().toISOString() }
        };
        (task as any).runId = runId;

        await store.upsertTask(task);
        await store.upsertTask(task); // Second call should be idempotent

        const savedTask = await store.getTask('task-1');
        expect(savedTask).toBeDefined();
        expect(savedTask?.subject).toBe('Test Task');
    });

    it('should handle task status updates', async () => {
        await store.updateTaskStatus('task-1', 'in_progress', {
            owner: 'agent-1',
            startedAt: new Date().toISOString()
        });

        const updatedTask = await store.getTask('task-1');
        expect(updatedTask?.status).toBe('in_progress');
        expect(updatedTask?.owner).toBe('agent-1');
    });

    it('should save to outbox', async () => {
        await store.saveToOutbox('test.topic', { data: 'payload' });
        const { rowCount } = await pool.query('SELECT * FROM orchestrator_outbox WHERE topic = $1', ['test.topic']);
        expect(rowCount).toBe(1);
    });
});
