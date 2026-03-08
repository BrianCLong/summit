"use strict";
/**
 * Agent Client Tests
 */
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const agent_client_js_1 = require("../src/lib/agent-client.js");
(0, globals_1.describe)('AgentClient', () => {
    let client;
    (0, globals_1.beforeEach)(() => {
        client = new agent_client_js_1.AgentClient({
            timeout: 5000,
            maxConcurrent: 3,
        });
    });
    (0, globals_1.describe)('spin', () => {
        (0, globals_1.it)('should spin up an investigation agent', async () => {
            const status = await client.spin({
                name: 'test-agent',
                type: 'investigation',
                parameters: { target: 'test' },
            });
            (0, globals_1.expect)(status).toHaveProperty('id');
            (0, globals_1.expect)(status).toHaveProperty('name', 'test-agent');
            (0, globals_1.expect)(status).toHaveProperty('type', 'investigation');
            (0, globals_1.expect)(status).toHaveProperty('status');
            (0, globals_1.expect)(status).toHaveProperty('progress');
        });
        (0, globals_1.it)('should complete agent execution', async () => {
            const status = await client.spin({
                name: 'complete-agent',
                type: 'analysis',
                parameters: {},
            });
            (0, globals_1.expect)(status.status).toBe('completed');
            (0, globals_1.expect)(status.progress).toBe(100);
            (0, globals_1.expect)(status).toHaveProperty('result');
        });
        (0, globals_1.it)('should track agent logs', async () => {
            const status = await client.spin({
                name: 'logged-agent',
                type: 'enrichment',
                parameters: {},
            });
            (0, globals_1.expect)(status.logs).toBeInstanceOf(Array);
            (0, globals_1.expect)(status.logs.length).toBeGreaterThan(0);
            (0, globals_1.expect)(status.logs[0]).toHaveProperty('timestamp');
            (0, globals_1.expect)(status.logs[0]).toHaveProperty('level');
            (0, globals_1.expect)(status.logs[0]).toHaveProperty('message');
        });
        (0, globals_1.it)('should run agent asynchronously', async () => {
            const status = await client.spin({
                name: 'async-agent',
                type: 'report',
                parameters: {},
            }, { async: true });
            // Async mode starts the agent immediately, so status may be 'pending' or 'running'
            (0, globals_1.expect)(['pending', 'running']).toContain(status.status);
        });
    });
    (0, globals_1.describe)('spinBatch', () => {
        (0, globals_1.it)('should spin up multiple agents sequentially', async () => {
            const configs = [
                { name: 'agent-1', type: 'investigation', parameters: {} },
                { name: 'agent-2', type: 'analysis', parameters: {} },
            ];
            const results = await client.spinBatch(configs, { parallel: false });
            (0, globals_1.expect)(results).toHaveLength(2);
            (0, globals_1.expect)(results.every((r) => r.status === 'completed')).toBe(true);
        });
        (0, globals_1.it)('should spin up multiple agents in parallel', async () => {
            const configs = [
                { name: 'parallel-1', type: 'enrichment', parameters: {} },
                { name: 'parallel-2', type: 'correlation', parameters: {} },
            ];
            const results = await client.spinBatch(configs, {
                parallel: true,
                maxConcurrent: 2,
            });
            (0, globals_1.expect)(results).toHaveLength(2);
        });
    });
    (0, globals_1.describe)('getStatus', () => {
        (0, globals_1.it)('should return status for existing agent', async () => {
            const spinResult = await client.spin({
                name: 'status-agent',
                type: 'investigation',
                parameters: {},
            });
            const status = await client.getStatus(spinResult.id);
            (0, globals_1.expect)(status).not.toBeNull();
            (0, globals_1.expect)(status?.id).toBe(spinResult.id);
        });
        (0, globals_1.it)('should return null for non-existent agent', async () => {
            const status = await client.getStatus('non-existent-id');
            (0, globals_1.expect)(status).toBeNull();
        });
    });
    (0, globals_1.describe)('cancel', () => {
        (0, globals_1.it)('should cancel a pending agent', async () => {
            const spinResult = await client.spin({
                name: 'cancel-agent',
                type: 'investigation',
                parameters: {},
            }, { async: true });
            const cancelled = await client.cancel(spinResult.id);
            (0, globals_1.expect)(cancelled).toBe(true);
            const status = await client.getStatus(spinResult.id);
            (0, globals_1.expect)(status?.status).toBe('cancelled');
        });
        (0, globals_1.it)('should return false for non-existent agent', async () => {
            const cancelled = await client.cancel('non-existent-id');
            (0, globals_1.expect)(cancelled).toBe(false);
        });
    });
    (0, globals_1.describe)('list', () => {
        (0, globals_1.it)('should list all agents', async () => {
            await client.spin({ name: 'list-1', type: 'investigation', parameters: {} });
            await client.spin({ name: 'list-2', type: 'analysis', parameters: {} });
            const agents = await client.list();
            (0, globals_1.expect)(agents.length).toBeGreaterThanOrEqual(2);
        });
        (0, globals_1.it)('should filter agents by type', async () => {
            await client.spin({ name: 'filter-1', type: 'investigation', parameters: {} });
            await client.spin({ name: 'filter-2', type: 'analysis', parameters: {} });
            const agents = await client.list({ type: 'investigation' });
            (0, globals_1.expect)(agents.every((a) => a.type === 'investigation')).toBe(true);
        });
    });
});
