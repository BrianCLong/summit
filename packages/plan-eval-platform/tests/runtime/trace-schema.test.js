"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const trace_schema_js_1 = require("../../src/runtime/trace-schema.js");
(0, vitest_1.describe)('TraceBuilder', () => {
    let builder;
    (0, vitest_1.beforeEach)(() => {
        builder = new trace_schema_js_1.TraceBuilder('test-scenario', 'run-001');
    });
    (0, vitest_1.it)('should create a trace with correct IDs', () => {
        const trace = builder.build();
        (0, vitest_1.expect)(trace.scenarioId).toBe('test-scenario');
        (0, vitest_1.expect)(trace.runId).toBe('run-001');
        (0, vitest_1.expect)(trace.id).toBeDefined();
        (0, vitest_1.expect)(trace.startTime).toBeDefined();
    });
    (0, vitest_1.it)('should record events with proper structure', () => {
        const eventId = builder.startEvent('request_start', 'test-request', {
            custom: 'attribute',
        });
        builder.endEvent(eventId, 'success', { durationMs: 100 });
        const trace = builder.build();
        const event = trace.events.find((e) => e.id === eventId);
        (0, vitest_1.expect)(event).toBeDefined();
        (0, vitest_1.expect)(event.type).toBe('request_start');
        (0, vitest_1.expect)(event.name).toBe('test-request');
        (0, vitest_1.expect)(event.status).toBe('success');
        (0, vitest_1.expect)(event.metrics?.durationMs).toBe(100);
        (0, vitest_1.expect)(event.attributes?.custom).toBe('attribute');
    });
    (0, vitest_1.it)('should handle nested events with parent IDs', () => {
        const parentId = builder.startEvent('request_start', 'parent');
        const childId = builder.startEvent('tool_call_start', 'child');
        builder.endEvent(childId, 'success');
        builder.endEvent(parentId, 'success');
        const trace = builder.build();
        const childEvent = trace.events.find((e) => e.id === childId);
        (0, vitest_1.expect)(childEvent.parentId).toBe(parentId);
    });
    (0, vitest_1.it)('should record routing decisions', () => {
        builder.recordRoutingDecision('code_interpreter', 0.85, ['Cost efficient', 'High quality'], [
            { toolId: 'web_browse', score: 0.7 },
        ]);
        const trace = builder.build();
        const routingEvent = trace.events.find((e) => e.type === 'routing_decision');
        (0, vitest_1.expect)(routingEvent).toBeDefined();
        (0, vitest_1.expect)(routingEvent.attributes?.selectedTool).toBe('code_interpreter');
        (0, vitest_1.expect)(routingEvent.attributes?.score).toBe(0.85);
    });
    (0, vitest_1.it)('should record safety checks', () => {
        builder.recordSafetyCheck('jailbreak_detection', true, 'low', 'No issues found');
        const trace = builder.build();
        const safetyEvent = trace.events.find((e) => e.type === 'safety_check');
        (0, vitest_1.expect)(safetyEvent).toBeDefined();
        (0, vitest_1.expect)(safetyEvent.attributes?.passed).toBe(true);
    });
    (0, vitest_1.it)('should record errors', () => {
        builder.recordError('TIMEOUT', 'Request timed out', 'Error: timeout at line 10');
        const trace = builder.build();
        const errorEvent = trace.events.find((e) => e.type === 'error');
        (0, vitest_1.expect)(errorEvent).toBeDefined();
        (0, vitest_1.expect)(errorEvent.error?.code).toBe('TIMEOUT');
        (0, vitest_1.expect)(errorEvent.status).toBe('failure');
    });
    (0, vitest_1.it)('should calculate summary metrics', () => {
        builder.startEvent('request_start', 'test');
        builder.endEvent(builder.build().events[0].id, 'success', {
            totalTokens: 100,
            costUsd: 0.01,
        });
        const trace = builder.build();
        (0, vitest_1.expect)(trace.summary).toBeDefined();
        (0, vitest_1.expect)(trace.summary.totalTokens).toBe(100);
        (0, vitest_1.expect)(trace.summary.totalCostUsd).toBe(0.01);
    });
    (0, vitest_1.it)('should add metadata', () => {
        builder.addMetadata('category', 'code_correction');
        builder.addMetadata('difficulty', 'easy');
        const trace = builder.build();
        (0, vitest_1.expect)(trace.metadata?.category).toBe('code_correction');
        (0, vitest_1.expect)(trace.metadata?.difficulty).toBe('easy');
    });
});
(0, vitest_1.describe)('parseTrace', () => {
    (0, vitest_1.it)('should parse valid trace JSON', () => {
        const json = {
            id: 'trace-001',
            scenarioId: 'test',
            runId: 'run-001',
            startTime: '2024-01-01T00:00:00Z',
            events: [],
        };
        const trace = (0, trace_schema_js_1.parseTrace)(json);
        (0, vitest_1.expect)(trace.id).toBe('trace-001');
    });
    (0, vitest_1.it)('should throw on invalid trace', () => {
        (0, vitest_1.expect)(() => (0, trace_schema_js_1.parseTrace)({})).toThrow('Invalid trace format');
    });
});
(0, vitest_1.describe)('mergeTraces', () => {
    (0, vitest_1.it)('should merge multiple traces', () => {
        const builder1 = new trace_schema_js_1.TraceBuilder('scenario', 'run-001');
        builder1.startEvent('request_start', 'req1');
        const trace1 = builder1.build();
        const builder2 = new trace_schema_js_1.TraceBuilder('scenario', 'run-001');
        builder2.startEvent('request_start', 'req2');
        const trace2 = builder2.build();
        const merged = (0, trace_schema_js_1.mergeTraces)([trace1, trace2]);
        (0, vitest_1.expect)(merged.events.length).toBe(2);
        (0, vitest_1.expect)(merged.scenarioId).toBe('scenario');
    });
    (0, vitest_1.it)('should throw on empty array', () => {
        (0, vitest_1.expect)(() => (0, trace_schema_js_1.mergeTraces)([])).toThrow('Cannot merge empty trace array');
    });
});
