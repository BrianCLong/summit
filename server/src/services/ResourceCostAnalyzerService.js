"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resourceCostAnalyzerService = exports.ResourceCostAnalyzerService = void 0;
const TenantCostService_js_1 = require("./TenantCostService.js");
const CostOptimizationService_js_1 = require("./CostOptimizationService.js");
const logger_js_1 = __importDefault(require("../utils/logger.js"));
class ResourceCostAnalyzerService {
    costOptimizationService;
    constructor() {
        this.costOptimizationService = new CostOptimizationService_js_1.CostOptimizationService();
    }
    /**
     * Generates a comprehensive cost analysis for a tenant, including breakdown by service
     * and optimization suggestions.
     */
    async getServiceCostAnalysis(tenantId, period = 'day') {
        try {
            // 1. Get Service Breakdown from TenantCostService
            const breakdown = await TenantCostService_js_1.tenantCostService.getServiceCostBreakdown(tenantId, period);
            const totalCost = breakdown.reduce((sum, item) => sum + item.cost, 0);
            // 2. Get Optimization Suggestions
            const optimizationOpportunities = await this.costOptimizationService.identifyOptimizationOpportunities(tenantId);
            // 3. Map Optimizations to Services
            const mappedOptimizations = optimizationOpportunities.map(opt => {
                let serviceName = opt.serviceName || 'General';
                // Fallback inference if serviceName not set (backward compatibility)
                if (serviceName === 'General') {
                    if (opt.id.includes('docling'))
                        serviceName = 'DoclingService';
                    else if (opt.id.includes('db-pool'))
                        serviceName = 'DatabaseService';
                    else if (opt.id.includes('ai-batch'))
                        serviceName = 'LLMService';
                    else if (opt.type.includes('storage'))
                        serviceName = 'StorageService';
                    else if (opt.type.includes('query'))
                        serviceName = 'DatabaseService';
                }
                return {
                    serviceName,
                    suggestion: opt.description,
                    potentialSavings: opt.potentialSavingsUSD,
                    priority: opt.potentialSavingsUSD > 50 ? 'high' : (opt.potentialSavingsUSD > 10 ? 'medium' : 'low')
                };
            });
            return {
                tenantId,
                period,
                totalCost,
                currency: 'USD',
                serviceBreakdown: breakdown,
                optimizations: mappedOptimizations
            };
        }
        catch (error) {
            logger_js_1.default.error('Failed to generate resource cost analysis', { tenantId, error: error.message });
            throw error;
        }
    }
}
exports.ResourceCostAnalyzerService = ResourceCostAnalyzerService;
exports.resourceCostAnalyzerService = new ResourceCostAnalyzerService();
