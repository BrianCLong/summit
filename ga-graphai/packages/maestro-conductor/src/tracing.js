"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExecutionTracer = void 0;
class ExecutionTracer {
    traces = new Map();
    start(taskId, intent) {
        const trace = {
            taskId,
            intent,
            status: 'running',
            entries: [],
            startedAt: new Date(),
        };
        this.traces.set(taskId, trace);
        return trace;
    }
    record(taskId, entry) {
        const trace = this.traces.get(taskId);
        if (!trace) {
            return;
        }
        trace.entries.push({ ...entry, timestamp: entry.timestamp ?? new Date() });
    }
    complete(taskId, status, metadata) {
        const trace = this.traces.get(taskId);
        if (!trace) {
            return;
        }
        trace.status = status;
        trace.completedAt = new Date();
        trace.metadata = { ...(trace.metadata ?? {}), ...(metadata ?? {}) };
    }
    get(taskId) {
        return this.traces.get(taskId);
    }
    list() {
        return [...this.traces.values()];
    }
}
exports.ExecutionTracer = ExecutionTracer;
