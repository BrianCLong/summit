"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventLogWriter = void 0;
const node_fs_1 = require("node:fs");
class EventLogWriter {
    events = [];
    append(event) {
        this.events.push(event);
        if (process.env.NODE_ENV === 'test' || !process.env.LOG_PATH) {
            return { ok: true };
        }
        try {
            (0, node_fs_1.appendFileSync)(process.env.LOG_PATH, `${JSON.stringify(event)}\n`, 'utf8');
            return { ok: true };
        }
        catch (error) {
            const errorEvent = {
                run_id: event.run_id,
                task_id: event.task_id,
                agent_name: event.agent_name,
                ts: new Date().toISOString(),
                type: 'LOG_WRITE_FAILED',
                inputs_hash: event.inputs_hash,
                outputs_hash: null,
                attempt: event.attempt,
                status: 'failed',
                metadata: {
                    reason: 'Event log write failure was constrained',
                    error: error instanceof Error ? error.message : String(error),
                    original_type: event.type,
                },
            };
            this.events.push(errorEvent);
            return { ok: false, errorEvent };
        }
    }
    flushToString() {
        return this.events.map((event) => JSON.stringify(event)).join('\n');
    }
    getEvents() {
        return [...this.events];
    }
}
exports.EventLogWriter = EventLogWriter;
