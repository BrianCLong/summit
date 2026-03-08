"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditEmitter = void 0;
const events_1 = require("events");
class AuditEmitter extends events_1.EventEmitter {
    static instance;
    constructor() {
        super();
    }
    static getInstance() {
        if (!AuditEmitter.instance) {
            AuditEmitter.instance = new AuditEmitter();
        }
        return AuditEmitter.instance;
    }
    emitAudit(event, data) {
        this.emit('audit', { event, data, timestamp: new Date() });
    }
}
exports.AuditEmitter = AuditEmitter;
