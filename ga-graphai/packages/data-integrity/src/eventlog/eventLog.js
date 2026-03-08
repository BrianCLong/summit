"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventLog = void 0;
const canonicalizer_js_1 = require("../canonical/canonicalizer.js");
class EventLog {
    options;
    events = [];
    constructor(options = {}) {
        this.options = options;
    }
    append(event) {
        const payloadHash = (0, canonicalizer_js_1.stableHash)(event.payload);
        const prevHash = this.events.at(-1)?.payloadHash;
        const signature = this.options.signer ? this.options.signer(payloadHash) : undefined;
        const canonical = { ...event, payloadHash, prevHash, signature };
        this.events.push(canonical);
        return canonical;
    }
    list(cursor = 0, limit = 20) {
        return this.events.slice(cursor, cursor + limit);
    }
    verify(scope, start = 0, end) {
        const slice = this.events
            .filter((event) => event.scope === scope)
            .slice(start, end ?? undefined);
        for (let i = 0; i < slice.length; i += 1) {
            const current = slice[i];
            const expectedHash = (0, canonicalizer_js_1.stableHash)(current.payload);
            if (current.payloadHash !== expectedHash) {
                return { valid: false, tamperedAt: i + start };
            }
            if (i > 0) {
                const prev = slice[i - 1];
                if (current.prevHash !== prev.payloadHash) {
                    return { valid: false, tamperedAt: i + start };
                }
            }
        }
        return { valid: true };
    }
}
exports.EventLog = EventLog;
