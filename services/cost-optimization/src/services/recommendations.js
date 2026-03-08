"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RecommendationService = void 0;
class RecommendationService {
    async getIdleResources(options) {
        return [];
    }
    async getSavingsOpportunities(options) {
        return {
            spotInstances: 0,
            reservedInstances: 0,
            savingsPlans: 0,
            total: 0
        };
    }
}
exports.RecommendationService = RecommendationService;
