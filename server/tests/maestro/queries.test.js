"use strict";
// server/tests/maestro/queries.test.ts
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const queries_1 = require("../../src/maestro/queries");
(0, globals_1.describe)('MaestroQueries', () => {
    (0, globals_1.it)('builds a MaestroRunResponse from graph data', async () => {
        const ig = {
            // writes not used in this test
            createRun: globals_1.jest.fn(),
            updateRun: globals_1.jest.fn(),
            createTask: globals_1.jest.fn(),
            updateTask: globals_1.jest.fn(),
            createArtifact: globals_1.jest.fn(),
            recordCostSample: globals_1.jest.fn(),
            // reads
            getRun: globals_1.jest.fn().mockResolvedValue({
                id: 'run-1',
                user: { id: 'user-1' },
                createdAt: new Date().toISOString(),
                requestText: 'hello',
            }),
            getTasksForRun: globals_1.jest.fn().mockResolvedValue([
                {
                    id: 'task-1',
                    runId: 'run-1',
                    status: 'succeeded',
                    agent: { id: 'agent-1', name: 'agent', kind: 'llm' },
                    kind: 'action',
                    description: 'do something',
                    input: {},
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                },
            ]),
            getTask: globals_1.jest.fn(),
            getArtifactsForRun: globals_1.jest.fn().mockResolvedValue([
                {
                    id: 'artifact-1',
                    runId: 'run-1',
                    taskId: 'task-1',
                    kind: 'text',
                    label: 'task-output',
                    data: 'result',
                    createdAt: new Date().toISOString(),
                },
            ]),
            getArtifactsForTask: globals_1.jest.fn(),
            getRunCostSummary: globals_1.jest.fn().mockResolvedValue({
                runId: 'run-1',
                totalCostUSD: 0.001,
                totalInputTokens: 10,
                totalOutputTokens: 20,
                byModel: {
                    'openai:gpt-4.1': {
                        costUSD: 0.001,
                        inputTokens: 10,
                        outputTokens: 20,
                    },
                },
            }),
        };
        const queries = new queries_1.MaestroQueries(ig);
        const response = await queries.getRunResponse('run-1');
        (0, globals_1.expect)(response).not.toBeNull();
        if (!response)
            return;
        (0, globals_1.expect)(response.run.id).toBe('run-1');
        (0, globals_1.expect)(response.tasks).toHaveLength(1);
        (0, globals_1.expect)(response.results[0].artifact?.data).toBe('result');
        (0, globals_1.expect)(response.costSummary.totalInputTokens).toBe(10);
    });
});
