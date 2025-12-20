import { Pool } from 'pg';
import { getPostgresPool } from '../config/database.js';
import { Plan, TenantPlan, Invoice, InvoiceLineItem } from '../types/usage.js';
import logger from '../utils/logger.js';
import { randomUUID } from 'crypto';

export class PricingEngine {
  private static instance: PricingEngine;
  private pool: Pool;

  private constructor() {
    this.pool = getPostgresPool();
  }

  public static getInstance(): PricingEngine {
    if (!PricingEngine.instance) {
      PricingEngine.instance = new PricingEngine();
    }
    return PricingEngine.instance;
  }

  async getEffectivePlan(tenantId: string): Promise<{ plan: Plan; overrides: Record<string, unknown> | null }> {
    const client = await this.pool.connect();
    try {
      const res = await client.query(
        `SELECT p.*, tp.custom_overrides
         FROM tenant_plans tp
         JOIN plans p ON tp.plan_id = p.id
         WHERE tp.tenant_id = $1
         AND (tp.effective_to IS NULL OR tp.effective_to > NOW())
         ORDER BY tp.effective_from DESC
         LIMIT 1`,
        [tenantId]
      );

      if (res.rows.length === 0) {
        // Fallback to a default plan if exists, or throw. For now, assume 'Free' exists or handle gracefully.
        // We will try to fetch a plan named 'Free'.
        const freePlanRes = await client.query(`SELECT * FROM plans WHERE name = 'Free'`);
        if (freePlanRes.rows.length > 0) {
          const plan = this.mapRowToPlan(freePlanRes.rows[0]);
          return { plan, overrides: null };
        }
        throw new Error(`No active plan found for tenant ${tenantId}`);
      }

      const row = res.rows[0];
      return {
        plan: this.mapRowToPlan(row),
        overrides: row.custom_overrides
      };
    } finally {
      client.release();
    }
  }

  private mapRowToPlan(row: any): Plan {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      currency: row.currency,
      limits: row.limits,
      features: row.features,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  /**
   * Estimate cost for a specific usage.
   * This is a simple estimation based on unit price defined in the plan.
   */
  async estimateCost(tenantId: string, kind: string, quantity: number): Promise<number> {
    const { plan, overrides } = await this.getEffectivePlan(tenantId);

    const limitConfig = plan.limits[kind];
    if (!limitConfig) return 0;

    // Check overrides
    // TODO: Merge logic for overrides

    const unitPrice = limitConfig.unitPrice || 0;
    // Simple calculation: just quantity * unitPrice.
    // Does not account for "included" amount because this is a stateless estimate for a single operation.
    return quantity * unitPrice;
  }

  /**
   * Generates an invoice for a given period based on aggregated usage.
   */
  async generateInvoice(tenantId: string, periodStart: string, periodEnd: string): Promise<Invoice> {
    const client = await this.pool.connect();
    try {
      const { plan } = await this.getEffectivePlan(tenantId);

      // Fetch summaries
      const summariesRes = await client.query(
        `SELECT * FROM usage_summaries
         WHERE tenant_id = $1
         AND period_start >= $2
         AND period_end <= $3`,
        [tenantId, periodStart, periodEnd]
      );

      const lineItems: InvoiceLineItem[] = [];
      let subtotal = 0;

      for (const row of summariesRes.rows) {
        const kind = row.kind;
        const totalQty = parseFloat(row.total_quantity);
        const limitConfig = plan.limits[kind];

        if (!limitConfig) continue;

        const included = limitConfig.monthlyIncluded || 0;
        const billableQty = Math.max(0, totalQty - included);
        const unitPrice = limitConfig.unitPrice || 0;
        const amount = billableQty * unitPrice;

        if (amount > 0) {
            lineItems.push({
                kind,
                quantity: billableQty, // Billed quantity
                unit: row.unit,
                unitPrice,
                amount,
                metadata: {
                    totalUsage: totalQty,
                    includedUsage: included
                }
            });
            subtotal += amount;
        }
      }

      const invoice: Invoice = {
          id: randomUUID(),
          tenantId,
          periodStart,
          periodEnd,
          currency: plan.currency,
          lineItems,
          subtotal,
          taxes: 0, // Placeholder
          total: subtotal, // + taxes
          status: 'DRAFT'
      };

      // Persist invoice
      await client.query(
          `INSERT INTO invoices (id, tenant_id, period_start, period_end, currency, line_items, subtotal, taxes, total, status)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
           [invoice.id, invoice.tenantId, invoice.periodStart, invoice.periodEnd, invoice.currency, JSON.stringify(invoice.lineItems), invoice.subtotal, invoice.taxes, invoice.total, invoice.status]
      );

      return invoice;

    } finally {
      client.release();
    }
  }
}

export default PricingEngine.getInstance();
