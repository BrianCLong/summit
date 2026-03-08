"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TenantQuotaManager = void 0;
class TenantQuotaManager {
    usage = new Map();
    registerLimit(tenantId, toolName, rule) {
        if (!this.usage.has(tenantId)) {
            this.usage.set(tenantId, new Map());
        }
        const tenantUsage = this.usage.get(tenantId);
        const existing = tenantUsage.get(toolName);
        if (!existing || existing.limit !== rule.limit) {
            tenantUsage.set(toolName, { limit: rule.limit, used: existing?.used ?? 0 });
        }
    }
    checkAndConsume(tenantId, toolName, limit) {
        if (!this.usage.has(tenantId)) {
            this.usage.set(tenantId, new Map());
        }
        const tenantUsage = this.usage.get(tenantId);
        let usage = tenantUsage.get(toolName);
        if (!usage) {
            usage = { limit, used: 0 };
            tenantUsage.set(toolName, usage);
        }
        else if (usage.limit !== limit) {
            usage.limit = limit;
        }
        if (usage.used >= usage.limit) {
            return false;
        }
        usage.used += 1;
        return true;
    }
    getUsage(tenantId, toolName) {
        return this.usage.get(tenantId)?.get(toolName);
    }
    reset(tenantId) {
        if (tenantId) {
            this.usage.delete(tenantId);
            return;
        }
        this.usage.clear();
    }
}
exports.TenantQuotaManager = TenantQuotaManager;
