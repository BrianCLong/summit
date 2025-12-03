import { describe, it, expect, beforeEach } from 'vitest';
import { TraceBuilder, parseTrace, mergeTraces } from '../../src/runtime/trace-schema.js';

describe('TraceBuilder', () => {
  let builder: TraceBuilder;

  beforeEach(() => {
    builder = new TraceBuilder('test-scenario', 'run-001');
  });

  it('should create a trace with correct IDs', () => {
    const trace = builder.build();

    expect(trace.scenarioId).toBe('test-scenario');
    expect(trace.runId).toBe('run-001');
    expect(trace.id).toBeDefined();
    expect(trace.startTime).toBeDefined();
  });

  it('should record events with proper structure', () => {
    const eventId = builder.startEvent('request_start', 'test-request', {
      custom: 'attribute',
    });

    builder.endEvent(eventId, 'success', { durationMs: 100 });

    const trace = builder.build();
    const event = trace.events.find((e) => e.id === eventId);

    expect(event).toBeDefined();
    expect(event!.type).toBe('request_start');
    expect(event!.name).toBe('test-request');
    expect(event!.status).toBe('success');
    expect(event!.metrics?.durationMs).toBe(100);
    expect(event!.attributes?.custom).toBe('attribute');
  });

  it('should handle nested events with parent IDs', () => {
    const parentId = builder.startEvent('request_start', 'parent');
    const childId = builder.startEvent('tool_call_start', 'child');

    builder.endEvent(childId, 'success');
    builder.endEvent(parentId, 'success');

    const trace = builder.build();
    const childEvent = trace.events.find((e) => e.id === childId);

    expect(childEvent!.parentId).toBe(parentId);
  });

  it('should record routing decisions', () => {
    builder.recordRoutingDecision('code_interpreter', 0.85, ['Cost efficient', 'High quality'], [
      { toolId: 'web_browse', score: 0.7 },
    ]);

    const trace = builder.build();
    const routingEvent = trace.events.find((e) => e.type === 'routing_decision');

    expect(routingEvent).toBeDefined();
    expect(routingEvent!.attributes?.selectedTool).toBe('code_interpreter');
    expect(routingEvent!.attributes?.score).toBe(0.85);
  });

  it('should record safety checks', () => {
    builder.recordSafetyCheck('jailbreak_detection', true, 'low', 'No issues found');

    const trace = builder.build();
    const safetyEvent = trace.events.find((e) => e.type === 'safety_check');

    expect(safetyEvent).toBeDefined();
    expect(safetyEvent!.attributes?.passed).toBe(true);
  });

  it('should record errors', () => {
    builder.recordError('TIMEOUT', 'Request timed out', 'Error: timeout at line 10');

    const trace = builder.build();
    const errorEvent = trace.events.find((e) => e.type === 'error');

    expect(errorEvent).toBeDefined();
    expect(errorEvent!.error?.code).toBe('TIMEOUT');
    expect(errorEvent!.status).toBe('failure');
  });

  it('should calculate summary metrics', () => {
    builder.startEvent('request_start', 'test');
    builder.endEvent(builder.build().events[0].id, 'success', {
      totalTokens: 100,
      costUsd: 0.01,
    });

    const trace = builder.build();

    expect(trace.summary).toBeDefined();
    expect(trace.summary!.totalTokens).toBe(100);
    expect(trace.summary!.totalCostUsd).toBe(0.01);
  });

  it('should add metadata', () => {
    builder.addMetadata('category', 'code_correction');
    builder.addMetadata('difficulty', 'easy');

    const trace = builder.build();

    expect(trace.metadata?.category).toBe('code_correction');
    expect(trace.metadata?.difficulty).toBe('easy');
  });
});

describe('parseTrace', () => {
  it('should parse valid trace JSON', () => {
    const json = {
      id: 'trace-001',
      scenarioId: 'test',
      runId: 'run-001',
      startTime: '2024-01-01T00:00:00Z',
      events: [],
    };

    const trace = parseTrace(json);
    expect(trace.id).toBe('trace-001');
  });

  it('should throw on invalid trace', () => {
    expect(() => parseTrace({})).toThrow('Invalid trace format');
  });
});

describe('mergeTraces', () => {
  it('should merge multiple traces', () => {
    const builder1 = new TraceBuilder('scenario', 'run-001');
    builder1.startEvent('request_start', 'req1');
    const trace1 = builder1.build();

    const builder2 = new TraceBuilder('scenario', 'run-001');
    builder2.startEvent('request_start', 'req2');
    const trace2 = builder2.build();

    const merged = mergeTraces([trace1, trace2]);

    expect(merged.events.length).toBe(2);
    expect(merged.scenarioId).toBe('scenario');
  });

  it('should throw on empty array', () => {
    expect(() => mergeTraces([])).toThrow('Cannot merge empty trace array');
  });
});
