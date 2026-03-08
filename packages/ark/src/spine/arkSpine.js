"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ArkSpine = void 0;
const crypto_1 = require("crypto");
const types_js_1 = require("../types.js");
class ArkSpine {
    taskGraph;
    sandboxBoundary;
    constructor(taskGraph, sandboxBoundary) {
        this.taskGraph = taskGraph;
        this.sandboxBoundary = sandboxBoundary;
    }
    async run(runId = (0, crypto_1.randomUUID)()) {
        const events = [];
        const taskResults = {};
        const orderedTasks = this.taskGraph.getExecutionOrder();
        for (const task of orderedTasks) {
            const request = {
                sandboxId: task.sandboxId,
                code: task.code,
                language: task.language,
                entryPoint: task.entryPoint,
                inputs: task.inputs,
                metadata: task.metadata,
            };
            events.push(this.createEvent(runId, types_js_1.EventType.TOOL_CALL_REQUESTED, {
                taskId: task.id,
                taskName: task.name,
            }));
            try {
                const result = await this.sandboxBoundary.execute(request);
                taskResults[task.id] = result;
                const eventType = result.status === 'success'
                    ? types_js_1.EventType.TOOL_CALL_COMPLETED
                    : types_js_1.EventType.TOOL_CALL_FAILED;
                events.push(this.createEvent(runId, eventType, {
                    taskId: task.id,
                    status: result.status,
                }));
            }
            catch (error) {
                const message = error instanceof Error ? error.message : 'Unknown error';
                taskResults[task.id] = {
                    executionId: (0, crypto_1.randomUUID)(),
                    status: 'error',
                    output: null,
                    logs: [message],
                };
                events.push(this.createEvent(runId, types_js_1.EventType.TOOL_CALL_FAILED, {
                    taskId: task.id,
                    status: 'error',
                    error: message,
                }));
            }
        }
        return { runId, events, taskResults };
    }
    createEvent(runId, type, payload) {
        return {
            event_id: (0, crypto_1.randomUUID)(),
            run_id: runId,
            ts: new Date(),
            type,
            payload,
        };
    }
}
exports.ArkSpine = ArkSpine;
