"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QuarantineRegistry = void 0;
class QuarantineRegistry {
    records = [];
    quarantine(contractId, version, reason) {
        const record = {
            contractId,
            version,
            reason,
            at: new Date().toISOString()
        };
        this.records.push(record);
        return record;
    }
    resolve(contractId, version, resolutionNote) {
        const entry = this.records.find((record) => record.contractId === contractId && record.version === version && !record.releasedAt);
        if (entry) {
            entry.releasedAt = new Date().toISOString();
            entry.resolutionNote = resolutionNote;
        }
        return entry;
    }
    active() {
        return this.records.filter((record) => !record.releasedAt);
    }
}
exports.QuarantineRegistry = QuarantineRegistry;
