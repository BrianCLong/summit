"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsageCollectorService = void 0;
class UsageCollectorService {
    buffer = [];
    recordUsage(tenantId, category, quantity, source) {
        this.buffer.push({
            id: crypto.randomUUID(),
            tenantId,
            timestamp: new Date(),
            category,
            quantity,
            unit: 'count', // simplify
            source
        });
    }
    flush() {
        const records = [...this.buffer];
        this.buffer = [];
        return records;
    }
}
exports.UsageCollectorService = UsageCollectorService;
