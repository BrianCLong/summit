"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BillingEngine = void 0;
class BillingEngine {
    usageRecords;
    plans;
    // In a real implementation, usageRecords would come from a DB
    constructor(usageRecords, plans) {
        this.usageRecords = usageRecords;
        this.plans = plans;
    }
    generateInvoice(tenantId, planId, periodStart, periodEnd) {
        const plan = this.plans.get(planId);
        if (!plan)
            throw new Error(`Plan ${planId} not found`);
        const tenantUsage = this.usageRecords.filter(r => r.tenantId === tenantId &&
            r.timestamp >= periodStart &&
            r.timestamp <= periodEnd);
        const aggregatedUsage = this.aggregateUsage(tenantUsage);
        const lineItems = [];
        let total = 0;
        for (const [category, quantity] of Object.entries(aggregatedUsage)) {
            const cat = category;
            const rate = plan.perUnitRates[cat] || 0;
            // Handle Quotas
            let billableQuantity = quantity;
            if (plan.includedQuotas && plan.includedQuotas[cat]) {
                billableQuantity = Math.max(0, quantity - plan.includedQuotas[cat]);
            }
            const itemTotal = billableQuantity * rate;
            lineItems.push({
                category: cat,
                quantity,
                rate,
                total: itemTotal
            });
            total += itemTotal;
        }
        return {
            id: crypto.randomUUID(),
            tenantId,
            periodStart,
            periodEnd,
            lineItems,
            total,
            status: 'DRAFT'
        };
    }
    aggregateUsage(records) {
        const agg = {};
        for (const r of records) {
            agg[r.category] = (agg[r.category] || 0) + r.quantity;
        }
        return agg;
    }
}
exports.BillingEngine = BillingEngine;
