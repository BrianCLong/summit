"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RecordSearchEngine = void 0;
class RecordSearchEngine {
    records = new Map();
    index(record) {
        this.records.set(record.id.id, record);
    }
    remove(recordId) {
        this.records.delete(recordId);
    }
    list() {
        return Array.from(this.records.values());
    }
    search(query) {
        return Array.from(this.records.values()).filter(record => {
            if (query.recordType && record.metadata.recordType !== query.recordType)
                return false;
            if (query.tenantId && record.metadata.tenantId !== query.tenantId)
                return false;
            if (query.classification && !record.metadata.classifications.includes(query.classification))
                return false;
            if (query.certificationStatus && record.certificationStatus !== query.certificationStatus)
                return false;
            if (query.createdAfter && record.createdAt < query.createdAfter)
                return false;
            if (query.createdBefore && record.createdAt > query.createdBefore)
                return false;
            if (query.tags && query.tags.some(tag => !record.metadata.tags.includes(tag)))
                return false;
            if (query.underHold && !(record.metadata.legalHolds && record.metadata.legalHolds.length > 0))
                return false;
            if (query.text) {
                const text = query.text.toLowerCase();
                const serialized = JSON.stringify(record.data).toLowerCase();
                const tags = record.metadata.tags.join(' ').toLowerCase();
                if (!serialized.includes(text) && !tags.includes(text)) {
                    return false;
                }
            }
            return true;
        });
    }
}
exports.RecordSearchEngine = RecordSearchEngine;
