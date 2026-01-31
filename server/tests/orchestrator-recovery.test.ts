import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PostgresStore } from '../src/orchestrator/PostgresStore.js';
import { Scheduler } from '@summit/orchestrator';
import { getPostgresPool } from '../src/db/postgres.js';

describe('Orchestrator Crash Recovery', () => {
    const pool = getPostgresPool();
    let store: PostgresStore;

    beforeAll(async () => {
        store = new PostgresStore();
    });

    afterAll(async () => {
        await pool.query('DELETE FROM orchestrator_events');
        await pool.query('DELETE FROM orchestrator_tasks');
        await pool.query('DELETE FROM orchestrator_runs');
    });

    it('should recover state from persistent store after a crash', async () => {
        const runId = 'crash-test-' + Date.now();
        await store.createRun(runId);

        const scheduler1 = new Scheduler(store, runId);

        // 1. Create a task
        await scheduler1.applyEvent({
            evidence_id: 'EV-1',
            type: 'TASK_CREATED',
            team_id: 'team-1',
            payload: { id: 'task-A', subject: 'Task A', status: 'pending', blockedBy: [], blocks: [], timestamps: { created: new Date().toISOString() } }
        });

        // 2. Start the task
        await scheduler1.applyEvent({
            evidence_id: 'EV-2',
            type: 'TASK_STARTED',
            team_id: 'team-1',
            payload: { taskId: 'task-A', agentId: 'agent-X', timestamp: new Date().toISOString() }
        });

        // Verify state in DB
        const taskBeforeCrash = await store.getTask('task-A');
        expect(taskBeforeCrash?.status).toBe('in_progress');

        // 3. Simulate CRASH (new scheduler instance with same store and runId)
        // In a real scenario, we might reload from the store
        const scheduler2 = new Scheduler(store, runId);

        // The store still has the state
        const taskAfterCrash = await scheduler2.store.getTask('task-A');
        expect(taskAfterCrash?.status).toBe('in_progress');
        expect(taskAfterCrash?.owner).toBe('agent-X');

        // 4. Continue orchestration
        await scheduler2.applyEvent({
            evidence_id: 'EV-3',
            type: 'TASK_COMPLETED',
            team_id: 'team-1',
            payload: { taskId: 'task-A', timestamp: new Date().toISOString() }
        });

        const finalTask = await store.getTask('task-A');
        expect(finalTask?.status).toBe('completed');
    });
});
