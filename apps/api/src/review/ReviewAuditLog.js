"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReviewAuditLog = void 0;
class ReviewAuditLog {
    clock;
    entries = [];
    constructor(clock = () => new Date()) {
        this.clock = clock;
    }
    record(itemId, decision) {
        const decidedAt = decision.decidedAt ?? this.clock().toISOString();
        this.entries.push({
            id: `audit_${this.entries.length + 1}`,
            itemId,
            correlationId: decision.correlationId,
            action: decision.action,
            reasonCode: decision.reasonCode,
            note: decision.note,
            decidedAt,
        });
    }
    getAll() {
        return [...this.entries];
    }
}
exports.ReviewAuditLog = ReviewAuditLog;
