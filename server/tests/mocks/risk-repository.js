"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RiskRepository = void 0;
// Mock for db/repositories/RiskRepository
class RiskRepository {
    async saveRiskScore(_input) {
        // No-op mock
    }
    async getRiskScore(_tenantId, _entityId) {
        return null;
    }
    async getRiskScores(_tenantId, _entityIds) {
        return [];
    }
}
exports.RiskRepository = RiskRepository;
exports.default = RiskRepository;
