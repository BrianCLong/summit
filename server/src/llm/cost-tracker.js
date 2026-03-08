"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CostTracker = void 0;
class CostTracker {
    usage = new Map();
    monthKey() {
        const now = new Date();
        return `${now.getUTCFullYear()}-${now.getUTCMonth() + 1}`;
    }
    ensureTenant(tenantId) {
        const key = this.monthKey();
        const existing = this.usage.get(tenantId);
        if (!existing || existing.monthKey !== key) {
            this.usage.set(tenantId, {
                monthKey: key,
                costUsd: 0,
                promptTokens: 0,
                completionTokens: 0,
            });
        }
    }
    canSpend(tenantId, estimatedCost, policy) {
        this.ensureTenant(tenantId);
        const usage = this.usage.get(tenantId);
        const projected = usage.costUsd + estimatedCost;
        if (projected > policy.monthlyCost.hard) {
            return { allowed: false, softExceeded: true };
        }
        const softExceeded = projected > policy.monthlyCost.soft;
        return { allowed: true, softExceeded };
    }
    record(tenantId, request, response, policy) {
        this.ensureTenant(tenantId);
        const usage = this.usage.get(tenantId);
        const promptTokens = response.usage.promptTokens || 0;
        const completionTokens = response.usage.completionTokens || 0;
        const totalCost = response.usage.cost ??
            ((promptTokens + completionTokens) / 1000) * 0.0001; // fallback negligible estimate
        usage.promptTokens += promptTokens;
        usage.completionTokens += completionTokens;
        usage.costUsd += totalCost;
        this.usage.set(tenantId, usage);
    }
    getUsage(tenantId) {
        this.ensureTenant(tenantId);
        return this.usage.get(tenantId);
    }
}
exports.CostTracker = CostTracker;
