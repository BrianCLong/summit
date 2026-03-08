"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const events_js_1 = require("../src/events.js");
const basePayload = {
    runId: 'run-1',
    pipelineId: 'pipe-a',
    stageCount: 2,
    planScore: 0.9,
};
(0, vitest_1.describe)('StructuredEventEmitter', () => {
    (0, vitest_1.it)('emits envelopes with metadata and validation', () => {
        const transport = vitest_1.vi.fn();
        const emitter = new events_js_1.StructuredEventEmitter({ transport });
        const envelope = emitter.emitEvent('summit.maestro.run.started', basePayload, {
            correlationId: 'corr-123',
            context: { service: 'meta-orchestrator', environment: 'test' },
        });
        (0, vitest_1.expect)(transport).toHaveBeenCalledOnce();
        const sentEnvelope = transport.mock.calls[0][0];
        (0, vitest_1.expect)(sentEnvelope.name).toBe('summit.maestro.run.started');
        (0, vitest_1.expect)(sentEnvelope.correlationId).toBe('corr-123');
        (0, vitest_1.expect)(envelope.payload).toEqual(basePayload);
    });
    (0, vitest_1.it)('rejects payloads missing required fields', () => {
        const emitter = new events_js_1.StructuredEventEmitter({ transport: vitest_1.vi.fn() });
        (0, vitest_1.expect)(() => emitter.emitEvent('summit.maestro.run.started', {
            // @ts-expect-error intentional missing runId
            pipelineId: 'pipe-a',
            stageCount: 1,
            planScore: 0.5,
        }, {})).toThrow(/Invalid payload/);
    });
    (0, vitest_1.it)('blocks sensitive-looking payload keys', () => {
        const emitter = new events_js_1.StructuredEventEmitter({ transport: vitest_1.vi.fn() });
        (0, vitest_1.expect)(() => emitter.emitEvent('summit.intelgraph.query.executed', {
            queryType: 'service',
            subjectId: 'svc-api',
            durationMs: 10,
            resultCount: 2,
            apiKey: 'should-not-be-logged',
        })).toThrow(/sensitive/);
    });
    (0, vitest_1.it)('summarizes outcomes for run lifecycle events', () => {
        const emitter = new events_js_1.StructuredEventEmitter({ transport: vitest_1.vi.fn() });
        const plan = {
            pipelineId: 'pipe-a',
            generatedAt: '2024-01-01T00:00:00Z',
            steps: [
                {
                    stageId: 's1',
                    primary: {
                        provider: 'aws',
                        region: 'us-east-1',
                        expectedCost: 1,
                        expectedThroughput: 100,
                        expectedLatency: 100,
                    },
                    fallbacks: [],
                    explanation: {
                        stageId: 's1',
                        provider: 'aws',
                        narrative: 'n',
                        scoreBreakdown: {},
                        constraints: [],
                    },
                },
            ],
            aggregateScore: 0.76,
            metadata: {},
        };
        const outcome = {
            plan,
            trace: [
                {
                    stageId: 's1',
                    provider: 'aws',
                    status: 'recovered',
                    startedAt: '2024-01-01T00:00:00Z',
                    finishedAt: '2024-01-01T00:00:05Z',
                    logs: ['ok'],
                    fallbackTriggered: 'execution-failure',
                },
            ],
            rewards: [],
        };
        const summary = emitter.summarizeOutcome(outcome);
        (0, vitest_1.expect)(summary.stageIds).toEqual(['s1']);
        (0, vitest_1.expect)(summary.recoveredCount).toBe(1);
        (0, vitest_1.expect)(summary.planScore).toBeCloseTo(0.76);
    });
    (0, vitest_1.it)('exposes schema registry entries', () => {
        (0, vitest_1.expect)(events_js_1.EVENT_SCHEMAS['summit.maestro.run.completed'].version).toBe('1.0');
    });
});
