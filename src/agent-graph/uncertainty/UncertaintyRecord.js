"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UncertaintyRegistry = void 0;
class UncertaintyRegistry {
    records = new Map();
    addRecord(record) {
        this.records.set(record.id, record);
    }
    getRecord(id) {
        return this.records.get(id);
    }
    getRecordsForTarget(targetId) {
        return Array.from(this.records.values()).filter(r => r.target_id === targetId);
    }
    updateRecordState(id, newState) {
        const record = this.records.get(id);
        if (record) {
            record.current_state = newState;
        }
    }
    getAllRecords() {
        return Array.from(this.records.values());
    }
}
exports.UncertaintyRegistry = UncertaintyRegistry;
