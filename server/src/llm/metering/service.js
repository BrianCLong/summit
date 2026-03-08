"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.llmMeteringService = exports.LlmMeteringService = void 0;
const quota_manager_js_1 = __importDefault(require("../../lib/resources/quota-manager.js"));
class LlmMeteringService {
    async checkQuota(tenantId, tokens) {
        const quota = quota_manager_js_1.default.getQuotaForTenant(tenantId);
        // Simple check on max tokens per request for now
        // Real metering would check usage over time vs budget
        if (tokens > quota.maxTokensPerRequest) {
            console.warn(`[Metering] Tenant ${tenantId} exceeded token limit: ${tokens} > ${quota.maxTokensPerRequest}`);
            return false;
        }
        return true;
    }
    async recordUsage(tenantId, provider, model, usage) {
        // In a real system, this would write to a time-series DB or usage service
        console.log(`[Metering] Recorded usage for ${tenantId}: ${usage.input} in, ${usage.output} out, $${usage.cost} USD via ${provider}/${model}`);
        // Here we could also update a 'spent today' counter in Redis and trigger alerts
    }
}
exports.LlmMeteringService = LlmMeteringService;
exports.llmMeteringService = new LlmMeteringService();
