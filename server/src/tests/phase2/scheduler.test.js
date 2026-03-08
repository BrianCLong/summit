"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const queue_memory_js_1 = require("../../platform/maestro-core/queue-memory.js");
const scheduler_js_1 = require("../../platform/maestro-core/scheduler.js");
const globals_1 = require("@jest/globals");
(0, globals_1.describe)('Maestro Priority Scheduler', () => {
    let queue;
    let scheduler;
    let mockSLOEngine;
    (0, globals_1.beforeEach)(() => {
        queue = new queue_memory_js_1.InMemoryTaskQueue();
        // Mock the SLO engine
        mockSLOEngine = {
            evaluate: globals_1.jest.fn()
        };
        scheduler = new scheduler_js_1.MaestroScheduler(queue, mockSLOEngine);
    });
    (0, globals_1.test)('should process CRITICAL tasks before LOW priority tasks', async () => {
        await scheduler.scheduleTask({
            tenantId: 't1',
            type: 'low-job',
            payload: {},
            priority: 'LOW',
            maxAttempts: 3
        });
        await scheduler.scheduleTask({
            tenantId: 't1',
            type: 'crit-job',
            payload: {},
            priority: 'CRITICAL',
            maxAttempts: 3
        });
        const task1 = await scheduler.processNext(['low-job', 'crit-job']);
        (0, globals_1.expect)(task1?.priority).toBe('CRITICAL');
        const task2 = await scheduler.processNext(['low-job', 'crit-job']);
        (0, globals_1.expect)(task2?.priority).toBe('LOW');
    });
    (0, globals_1.test)('should enforce SLA expiration check', async () => {
        const task = await scheduler.scheduleTask({
            tenantId: 't1',
            type: 'sla-job',
            payload: {},
            priority: 'NORMAL',
            slaSeconds: 1,
            maxAttempts: 3
        });
        (0, globals_1.expect)(scheduler.checkSLACompliance(task)).toBe(true);
        // Simulate time passing
        task.createdAt = new Date(Date.now() - 2000);
        (0, globals_1.expect)(scheduler.checkSLACompliance(task)).toBe(false);
    });
    (0, globals_1.test)('should evaluate SLO when processing task', async () => {
        await scheduler.scheduleTask({
            tenantId: 't1',
            type: 'test-job',
            payload: {},
            priority: 'NORMAL',
            maxAttempts: 3
        });
        await scheduler.processNext(['test-job']);
        (0, globals_1.expect)(mockSLOEngine.evaluate).toHaveBeenCalledWith(globals_1.expect.any(Number), 'maestro-task-queue-latency');
    });
});
