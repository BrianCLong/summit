"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
const node_process_1 = require("node:process");
class StructuredLogger {
    context;
    constructor(context = {}) {
        this.context = context;
    }
    child(additionalContext) {
        return new StructuredLogger({ ...this.context, ...additionalContext });
    }
    debug(payload, message) {
        this.log('debug', payload, message);
    }
    info(payload, message) {
        this.log('info', payload, message);
    }
    warn(payload, message) {
        this.log('warn', payload, message);
    }
    error(payload, message) {
        this.log('error', payload, message);
    }
    log(level, payload, message) {
        const entry = {
            level,
            timestamp: new Date().toISOString(),
            ...this.context,
        };
        if (typeof payload === 'string') {
            entry.message = payload;
        }
        else {
            Object.assign(entry, payload);
            if (message) {
                entry.message = message;
            }
        }
        node_process_1.stdout.write(`${JSON.stringify(entry)}\n`);
    }
}
exports.logger = new StructuredLogger({ service: 'summit-api' });
