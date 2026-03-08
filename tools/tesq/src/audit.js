"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditLog = void 0;
const crypto_1 = require("crypto");
class AuditLog {
    events = [];
    record(type, metadata, parentId) {
        const event = {
            id: (0, crypto_1.randomUUID)(),
            type,
            parentId,
            timestamp: Date.now(),
            metadata
        };
        this.events.push(event);
        return event;
    }
    getEvents() {
        return [...this.events];
    }
    findChildren(parentId) {
        return this.events.filter((event) => event.parentId === parentId);
    }
}
exports.AuditLog = AuditLog;
