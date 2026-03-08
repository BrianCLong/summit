"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.provenanceLedger = exports.ProvenanceLedger = void 0;
const crypto_1 = require("crypto");
function toJsonValue(input) {
    if (input === null ||
        typeof input === 'string' ||
        typeof input === 'number' ||
        typeof input === 'boolean') {
        return input;
    }
    if (Array.isArray(input)) {
        return input.map((value) => toJsonValue(value));
    }
    if (typeof input === 'object' && input !== null) {
        const record = {};
        for (const [key, value] of Object.entries(input)) {
            record[key] = toJsonValue(value);
        }
        return record;
    }
    return String(input);
}
class ProvenanceLedger {
    entries = [];
    record(actor, action, details) {
        const entry = {
            id: (0, crypto_1.randomUUID)(),
            timestamp: new Date().toISOString(),
            actor,
            action,
            details: toJsonValue(details),
        };
        this.entries.push(entry);
        return entry;
    }
    list() {
        return [...this.entries];
    }
    clear() {
        this.entries = [];
    }
}
exports.ProvenanceLedger = ProvenanceLedger;
exports.provenanceLedger = new ProvenanceLedger();
