import { Plan, InvoiceLineItem, UsageKind } from '../types/usage.js';

export interface PricingEstimate {
  planId: string;
  totalCost: number;
  currency: string;
  lineItems: InvoiceLineItem[];
}

export class PricingCalculator {
  /**
   * Calculates the estimated cost for a given usage profile against a specific plan.
   * This is a "stateless" calculation that does not query the database for past usage.
   * It assumes the provided usage is the *total* usage for the period.
   */
  public static calculateEstimate(plan: Plan, usage: Record<string, number>): PricingEstimate {
    const lineItems: InvoiceLineItem[] = [];
    let totalCost = plan.basePrice || 0;

    // Add base price line item if applicable
    if (totalCost > 0) {
        lineItems.push({
            kind: 'custom', // Or a 'base_fee' kind if we define it
            quantity: 1,
            unit: 'month',
            unitPrice: totalCost,
            amount: totalCost,
            metadata: { description: 'Monthly Base Price' }
        });
    }

    for (const [kindStr, quantity] of Object.entries(usage)) {
        const kind = kindStr as UsageKind; // Type assertion, could validate
        const limitConfig = plan.limits[kindStr];

        if (!limitConfig) {continue;}

        const included = limitConfig.monthlyIncluded || 0;
        const billableQty = Math.max(0, quantity - included);
        const unitPrice = limitConfig.unitPrice || 0;
        const amount = billableQty * unitPrice;

        if (amount > 0 || billableQty > 0) {
            lineItems.push({
                kind,
                quantity: billableQty,
                unit: 'unit', // We might want to look up unit from somewhere else if Plan doesn't have it
                unitPrice,
                amount,
                metadata: {
                    totalRequested: quantity,
                    included: included
                }
            });
            totalCost += amount;
        }
    }

    return {
        planId: plan.id,
        totalCost,
        currency: plan.currency,
        lineItems
    };
  }

  /**
   * Compares multiple plans for a given usage profile to find the most cost-effective one.
   */
  public static comparePlans(plans: Plan[], usage: Record<string, number>): PricingEstimate[] {
      return plans.map(plan => this.calculateEstimate(plan, usage))
                  .sort((a, b) => a.totalCost - b.totalCost);
  }
}

export default PricingCalculator;
