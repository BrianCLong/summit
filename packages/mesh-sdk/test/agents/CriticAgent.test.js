"use strict";
/**
 * CriticAgent Tests
 */
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const CriticAgent_js_1 = require("../../src/agents/CriticAgent.js");
(0, vitest_1.describe)('CriticAgent', () => {
    let agent;
    let mockServices;
    (0, vitest_1.beforeEach)(() => {
        agent = new CriticAgent_js_1.CriticAgent();
        mockServices = createMockServices();
    });
    (0, vitest_1.describe)('getDescriptor', () => {
        (0, vitest_1.it)('should return correct agent metadata', () => {
            const descriptor = agent.getDescriptor();
            (0, vitest_1.expect)(descriptor.name).toBe('critic-agent');
            (0, vitest_1.expect)(descriptor.role).toBe('critic');
            (0, vitest_1.expect)(descriptor.riskTier).toBe('low');
            (0, vitest_1.expect)(descriptor.capabilities).toContain('quality_assessment');
        });
    });
    (0, vitest_1.describe)('onTaskReceived', () => {
        (0, vitest_1.it)('should approve high-quality content', async () => {
            mockServices.model.complete = vitest_1.vi.fn().mockResolvedValue({
                content: JSON.stringify({
                    score: 90,
                    rationale: 'Well-structured code',
                    issues: [],
                }),
                tokensIn: 100,
                tokensOut: 50,
                latencyMs: 200,
                model: 'claude-sonnet-4-5-20250929',
                provider: 'anthropic',
            });
            const input = {
                task: {
                    id: 'task-1',
                    type: 'review',
                    input: {},
                    priority: 1,
                    metadata: {},
                    createdAt: new Date().toISOString(),
                },
                context: {},
                payload: {
                    content: 'function add(a, b) { return a + b; }',
                    contentType: 'code',
                },
            };
            const result = await agent.onTaskReceived(input, mockServices);
            (0, vitest_1.expect)(result.status).toBe('completed');
            (0, vitest_1.expect)(result.result?.verdict).toBe('approved');
        });
        (0, vitest_1.it)('should reject content with critical issues', async () => {
            mockServices.model.complete = vitest_1.vi.fn().mockResolvedValue({
                content: JSON.stringify({
                    score: 20,
                    rationale: 'Contains security vulnerabilities',
                    issues: [
                        { severity: 'critical', category: 'safety', description: 'SQL injection vulnerability' },
                    ],
                }),
                tokensIn: 100,
                tokensOut: 100,
                latencyMs: 300,
                model: 'claude-sonnet-4-5-20250929',
                provider: 'anthropic',
            });
            const input = {
                task: {
                    id: 'task-1',
                    type: 'review',
                    input: {},
                    priority: 1,
                    metadata: {},
                    createdAt: new Date().toISOString(),
                },
                context: {},
                payload: {
                    content: 'db.query(`SELECT * FROM users WHERE id = ${userId}`)',
                    contentType: 'code',
                },
            };
            const result = await agent.onTaskReceived(input, mockServices);
            (0, vitest_1.expect)(result.status).toBe('completed');
            (0, vitest_1.expect)(result.result?.verdict).toBe('rejected');
            (0, vitest_1.expect)(result.result?.issues.length).toBeGreaterThan(0);
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
