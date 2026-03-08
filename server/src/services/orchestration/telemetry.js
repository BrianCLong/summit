"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tracer = void 0;
exports.traceTask = traceTask;
const api_1 = require("@opentelemetry/api");
exports.tracer = api_1.trace.getTracer('agent-orchestrator');
async function traceTask(taskName, fn) {
    return exports.tracer.startActiveSpan(taskName, async (span) => {
        try {
            const result = await fn();
            span.setStatus({ code: api_1.SpanStatusCode.OK });
            return result;
        }
        catch (err) {
            span.setStatus({
                code: api_1.SpanStatusCode.ERROR,
                message: err.message,
            });
            throw err;
        }
        finally {
            span.end();
        }
    });
}
