"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditLedger = void 0;
const crypto_1 = require("crypto");
const uuid_1 = require("uuid");
class AuditLedger {
    events = [];
    recordEvent(input) {
        const timestamp = input.timestamp ?? new Date();
        const prevHash = this.events[this.events.length - 1]?.hash;
        const payload = {
            ...input,
            timestamp: timestamp.toISOString(),
            prevHash,
        };
        const hash = (0, crypto_1.createHash)('sha256')
            .update(JSON.stringify(payload))
            .digest('hex');
        const event = {
            id: (0, uuid_1.v4)(),
            ...input,
            timestamp,
            prevHash,
            hash,
        };
        this.events.push(event);
        return event;
    }
    getEventsForRecord(recordId) {
        return this.events.filter(e => e.recordId === recordId);
    }
    getAllEvents() {
        return [...this.events];
    }
    verifyIntegrity() {
        for (let i = 0; i < this.events.length; i++) {
            const event = this.events[i];
            const prevHash = i === 0 ? undefined : this.events[i - 1].hash;
            const payload = {
                recordId: event.recordId,
                recordType: event.recordType,
                tenantId: event.tenantId,
                actor: event.actor,
                action: event.action,
                reason: event.reason,
                metadata: event.metadata,
                timestamp: event.timestamp.toISOString(),
                prevHash,
            };
            const expected = (0, crypto_1.createHash)('sha256')
                .update(JSON.stringify(payload))
                .digest('hex');
            if (expected !== event.hash || event.prevHash !== prevHash) {
                return false;
            }
        }
        return true;
    }
}
exports.AuditLedger = AuditLedger;
