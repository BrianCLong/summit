"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TraceBuilder = void 0;
exports.parseTrace = parseTrace;
exports.mergeTraces = mergeTraces;
const node_crypto_1 = require("node:crypto");
/**
 * TraceBuilder - Fluent API for constructing evaluation traces
 *
 * Captures structured traces for every request + tool call + routing decision
 * with latency, token usage, cost, and safety annotations.
 */
class TraceBuilder {
    traceId;
    scenarioId;
    runId;
    startTime;
    endTime;
    events = [];
    eventStack = [];
    metadata = {};
    constructor(scenarioId, runId) {
        this.traceId = (0, node_crypto_1.randomUUID)();
        this.scenarioId = scenarioId;
        this.runId = runId;
        this.startTime = new Date();
    }
    /**
     * Start a new span/event
     */
    startEvent(type, name, attributes) {
        const eventId = (0, node_crypto_1.randomUUID)();
        const parentId = this.eventStack.length > 0
            ? this.eventStack[this.eventStack.length - 1]
            : undefined;
        const event = {
            id: eventId,
            traceId: this.traceId,
            parentId,
            timestamp: new Date().toISOString(),
            type,
            name,
            attributes,
            status: 'pending',
        };
        this.events.push(event);
        this.eventStack.push(eventId);
        return eventId;
    }
    /**
     * End the current span/event with metrics
     */
    endEvent(eventId, status, metrics, error) {
        const event = this.events.find((e) => e.id === eventId);
        if (!event) {
            throw new Error(`Event ${eventId} not found`);
        }
        event.status = status;
        event.metrics = metrics;
        if (error) {
            event.error = error;
        }
        // Pop from stack
        const stackIdx = this.eventStack.indexOf(eventId);
        if (stackIdx >= 0) {
            this.eventStack.splice(stackIdx, 1);
        }
    }
    /**
     * Record a routing decision
     */
    recordRoutingDecision(selectedTool, score, reasoning, alternatives) {
        this.startEvent('routing_decision', `route:${selectedTool}`, {
            selectedTool,
            score,
            reasoning,
            alternatives,
        });
        // Routing decisions are instantaneous
        this.endEvent(this.eventStack[this.eventStack.length - 1], 'success');
    }
    /**
     * Record a safety check
     */
    recordSafetyCheck(checkType, passed, severity, details) {
        const eventId = this.startEvent('safety_check', `safety:${checkType}`, {
            checkType,
            passed,
            severity,
            details,
        });
        this.endEvent(eventId, passed ? 'success' : 'failure');
    }
    /**
     * Record an error
     */
    recordError(code, message, stack) {
        const eventId = this.startEvent('error', `error:${code}`, {
            code,
            message,
        });
        this.endEvent(eventId, 'failure', undefined, { code, message, stack });
    }
    /**
     * Add metadata to the trace
     */
    addMetadata(key, value) {
        this.metadata[key] = value;
    }
    /**
     * Finalize and build the trace
     */
    build() {
        this.endTime = new Date();
        // Calculate summary
        const totalDurationMs = this.endTime.getTime() - this.startTime.getTime();
        let totalTokens = 0;
        let totalCostUsd = 0;
        let toolCallCount = 0;
        let errorCount = 0;
        let safetyViolations = 0;
        for (const event of this.events) {
            if (event.metrics) {
                totalTokens += event.metrics.totalTokens ?? 0;
                totalCostUsd += event.metrics.costUsd ?? 0;
            }
            if (event.type === 'tool_call_start' ||
                event.type === 'tool_call_end') {
                toolCallCount += 0.5; // Count pairs
            }
            if (event.status === 'failure') {
                errorCount++;
            }
            if (event.type === 'safety_check' &&
                event.attributes?.passed === false) {
                safetyViolations++;
            }
        }
        const success = errorCount === 0 &&
            safetyViolations === 0 &&
            this.events.some((e) => e.type === 'request_end' && e.status === 'success');
        return {
            id: this.traceId,
            scenarioId: this.scenarioId,
            runId: this.runId,
            startTime: this.startTime.toISOString(),
            endTime: this.endTime.toISOString(),
            events: this.events,
            summary: {
                success,
                totalDurationMs,
                totalTokens,
                totalCostUsd,
                toolCallCount: Math.floor(toolCallCount),
                errorCount,
                safetyViolations,
            },
            metadata: this.metadata,
        };
    }
}
exports.TraceBuilder = TraceBuilder;
/**
 * Parse and validate a trace from JSON
 */
function parseTrace(json) {
    // Basic validation - in production use Zod schema
    const trace = json;
    if (!trace.id || !trace.scenarioId || !trace.events) {
        throw new Error('Invalid trace format');
    }
    return trace;
}
/**
 * Merge multiple traces into a combined trace
 */
function mergeTraces(traces) {
    if (traces.length === 0) {
        throw new Error('Cannot merge empty trace array');
    }
    const merged = {
        id: (0, node_crypto_1.randomUUID)(),
        scenarioId: traces[0].scenarioId,
        runId: traces[0].runId,
        startTime: traces.reduce((min, t) => (t.startTime < min ? t.startTime : min), traces[0].startTime),
        endTime: traces.reduce((max, t) => (t.endTime && t.endTime > max ? t.endTime : max), traces[0].endTime ?? traces[0].startTime),
        events: traces.flatMap((t) => t.events),
        summary: {
            success: traces.every((t) => t.summary?.success ?? false),
            totalDurationMs: traces.reduce((sum, t) => sum + (t.summary?.totalDurationMs ?? 0), 0),
            totalTokens: traces.reduce((sum, t) => sum + (t.summary?.totalTokens ?? 0), 0),
            totalCostUsd: traces.reduce((sum, t) => sum + (t.summary?.totalCostUsd ?? 0), 0),
            toolCallCount: traces.reduce((sum, t) => sum + (t.summary?.toolCallCount ?? 0), 0),
            errorCount: traces.reduce((sum, t) => sum + (t.summary?.errorCount ?? 0), 0),
            safetyViolations: traces.reduce((sum, t) => sum + (t.summary?.safetyViolations ?? 0), 0),
        },
    };
    return merged;
}
