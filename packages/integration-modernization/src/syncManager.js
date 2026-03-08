"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SyncManager = void 0;
const crypto_1 = require("crypto");
class SyncManager {
    systemOfRecord = new Map();
    lastTokens = new Map();
    quarantine = [];
    timeline = new Map();
    defineSystemOfRecord(objectType, connectorId) {
        this.systemOfRecord.set(objectType, connectorId);
    }
    incrementalSync(connectorId, token, payloads) {
        this.lastTokens.set(connectorId, token);
        const record = this.startRecord(connectorId, token, payloads, false);
        this.finishRecord(record);
        this.appendTimeline(connectorId, record);
        return record;
    }
    fullResync(connectorId, payloads) {
        const record = this.startRecord(connectorId, undefined, payloads, true);
        this.finishRecord(record);
        this.appendTimeline(connectorId, record);
        return record;
    }
    reconcile(connectorId, expected, actual, identityFields) {
        const drift = {};
        const resolved = [];
        identityFields.forEach((field) => {
            if (expected[field] !== actual[field]) {
                drift[field] = { expected: expected[field], actual: actual[field] };
            }
            else {
                resolved.push(field);
            }
        });
        return { drift, resolved };
    }
    validatePayload(connectorId, payload, rules) {
        for (const rule of rules) {
            const valid = rule(payload);
            if (!valid) {
                const record = {
                    connectorId,
                    reason: 'validation_failed',
                    payload,
                    timestamp: Date.now()
                };
                this.quarantine.push(record);
                return false;
            }
        }
        return true;
    }
    quarantineRecords() {
        return [...this.quarantine];
    }
    timelineFor(connectorId) {
        return this.timeline.get(connectorId) ?? [];
    }
    startRecord(connectorId, token, payloads, fullResync) {
        return {
            id: (0, crypto_1.randomUUID)(),
            connectorId,
            token,
            payloads,
            fullResync,
            startedAt: Date.now()
        };
    }
    finishRecord(record) {
        record.completedAt = Date.now();
    }
    appendTimeline(connectorId, record) {
        const existing = this.timeline.get(connectorId) ?? [];
        this.timeline.set(connectorId, [...existing, record]);
    }
}
exports.SyncManager = SyncManager;
