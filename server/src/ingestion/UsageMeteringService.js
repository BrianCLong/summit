"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsageMeteringService = void 0;
class UsageMeteringService {
    async trackIngestion(tenantId, type, count) {
        // Stub implementation
        // In production, this would write to a timeseries DB or billing service
        // console.log(`[Usage] Tenant ${tenantId}: +${count} ${type}s`);
    }
}
exports.UsageMeteringService = UsageMeteringService;
