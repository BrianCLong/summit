import { UsageRecord, PricePlan, Invoice, InvoiceLineItem, UsageCategory } from './types.js';

export class BillingEngine {
  // In a real implementation, usageRecords would come from a DB
  constructor(private usageRecords: UsageRecord[], private plans: Map<string, PricePlan>) {}

  generateInvoice(tenantId: string, planId: string, periodStart: Date, periodEnd: Date): Invoice {
    const plan = this.plans.get(planId);
    if (!plan) throw new Error(`Plan ${planId} not found`);

    const tenantUsage = this.usageRecords.filter(r =>
      r.tenantId === tenantId &&
      r.timestamp >= periodStart &&
      r.timestamp <= periodEnd
    );

    const aggregatedUsage = this.aggregateUsage(tenantUsage);
    const lineItems: InvoiceLineItem[] = [];
    let total = 0;

    for (const [category, quantity] of Object.entries(aggregatedUsage)) {
      const cat = category as UsageCategory;
      const rate = plan.perUnitRates[cat] || 0;

      // Handle Quotas
      let billableQuantity = quantity;
      if (plan.includedQuotas && plan.includedQuotas[cat]) {
        billableQuantity = Math.max(0, quantity - plan.includedQuotas[cat]!);
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

  private aggregateUsage(records: UsageRecord[]): Record<UsageCategory, number> {
    const agg: Record<string, number> = {};
    for (const r of records) {
      agg[r.category] = (agg[r.category] || 0) + r.quantity;
    }
    return agg as Record<UsageCategory, number>;
  }
}
