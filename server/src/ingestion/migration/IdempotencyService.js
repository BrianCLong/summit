"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IdempotencyService = void 0;
class IdempotencyService {
    // In a real implementation, this would use Redis or a DB table
    processedRecords = new Set();
    async hasProcessed(ctx, recordId) {
        const key = this.getKey(ctx, recordId);
        return this.processedRecords.has(key);
    }
    async markProcessed(ctx, recordId) {
        const key = this.getKey(ctx, recordId);
        this.processedRecords.add(key);
    }
    getKey(ctx, recordId) {
        return `${ctx.tenantId}:${ctx.migrationId}:${recordId}`;
    }
    // Helper for testing
    clear() {
        this.processedRecords.clear();
    }
}
exports.IdempotencyService = IdempotencyService;
