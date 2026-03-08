"use strict";
/**
 * PlannerAgent Tests
 */
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const PlannerAgent_js_1 = require("../../src/agents/PlannerAgent.js");
(0, vitest_1.describe)('PlannerAgent', () => {
    let agent;
    let mockServices;
    (0, vitest_1.beforeEach)(() => {
        agent = new PlannerAgent_js_1.PlannerAgent();
        mockServices = createMockServices();
    });
    (0, vitest_1.describe)('getDescriptor', () => {
        (0, vitest_1.it)('should return correct agent metadata', () => {
            const descriptor = agent.getDescriptor();
            (0, vitest_1.expect)(descriptor.name).toBe('planner-agent');
            (0, vitest_1.expect)(descriptor.role).toBe('planner');
            (0, vitest_1.expect)(descriptor.riskTier).toBe('medium');
            (0, vitest_1.expect)(descriptor.capabilities).toContain('task_decomposition');
        });
    });
    (0, vitest_1.describe)('onTaskReceived', () => {
        (0, vitest_1.it)('should generate a plan from an objective', async () => {
            mockServices.model.complete = vitest_1.vi.fn().mockResolvedValue({
                content: JSON.stringify({
                    steps: [
                        { id: 'step-1', description: 'Research', agentRole: 'researcher', dependencies: [], priority: 1 },
                    ],
                    estimatedDuration: 30,
                    riskAssessment: 'Low risk',
                }),
                tokensIn: 100,
                tokensOut: 200,
                latencyMs: 500,
                model: 'claude-sonnet-4-5-20250929',
                provider: 'anthropic',
            });
            mockServices.mesh.spawnSubtask = vitest_1.vi.fn().mockResolvedValue('subtask-1');
            mockServices.mesh.awaitSubtask = vitest_1.vi.fn().mockResolvedValue({
                taskId: 'subtask-1',
                status: 'completed',
                result: {},
            });
            const input = {
                task: {
                    id: 'task-1',
                    type: 'planning',
                    input: {},
                    priority: 1,
                    metadata: {},
                    createdAt: new Date().toISOString(),
                },
                context: {},
                payload: { objective: 'Implement a new feature' },
            };
            const result = await agent.onTaskReceived(input, mockServices);
            (0, vitest_1.expect)(result.status).toBe('completed');
            (0, vitest_1.expect)(result.result).toHaveProperty('plan');
            (0, vitest_1.expect)(result.result?.plan.steps).toHaveLength(1);
        });
        (0, vitest_1.it)('should handle planning failures gracefully', async () => {
            mockServices.model.complete = vitest_1.vi.fn().mockRejectedValue(new Error('Model unavailable'));
            const input = {
                task: {
                    id: 'task-1',
                    type: 'planning',
                    input: {},
                    priority: 1,
                    metadata: {},
                    createdAt: new Date().toISOString(),
                },
                context: {},
                payload: { objective: 'Test objective' },
            };
            const result = await agent.onTaskReceived(input, mockServices);
            (0, vitest_1.expect)(result.status).toBe('failed');
            (0, vitest_1.expect)(result.error?.code).toBe('PLANNING_FAILED');
            (0, vitest_1.expect)(result.error?.recoverable).toBe(true);
        });
    });
});
function createMockServices() {
    return {
        provenance: {
            record: vitest_1.vi.fn().mockResolvedValue('record-id'),
            query: vitest_1.vi.fn().mockResolvedValue([]),
        },
        tools: {
            invoke: vitest_1.vi.fn().mockResolvedValue({}),
            list: vitest_1.vi.fn().mockResolvedValue([]),
            get: vitest_1.vi.fn().mockResolvedValue(null),
        },
        model: {
            complete: vitest_1.vi.fn().mockResolvedValue({ content: '', tokensIn: 0, tokensOut: 0, latencyMs: 0, model: '', provider: '' }),
            chat: vitest_1.vi.fn().mockResolvedValue({ content: '', tokensIn: 0, tokensOut: 0, latencyMs: 0, model: '', provider: '' }),
        },
        mesh: {
            spawnSubtask: vitest_1.vi.fn().mockResolvedValue('subtask-id'),
            awaitSubtask: vitest_1.vi.fn().mockResolvedValue({ taskId: '', status: 'completed', result: {} }),
            requestAgent: vitest_1.vi.fn().mockResolvedValue(null),
        },
        metrics: {
            increment: vitest_1.vi.fn(),
            gauge: vitest_1.vi.fn(),
            histogram: vitest_1.vi.fn(),
            timing: vitest_1.vi.fn(),
        },
        logger: {
            debug: vitest_1.vi.fn(),
            info: vitest_1.vi.fn(),
            warn: vitest_1.vi.fn(),
            error: vitest_1.vi.fn(),
        },
    };
}
