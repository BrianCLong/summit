import { BillingProvider } from './provider';
import { Pool } from 'pg';
import { EOL } from 'os';

/**
 * A billing provider for internal chargeback scenarios (e.g., GovCloud).
 * It generates a CSV report of usage rather than interfacing with a payment provider.
 */
export class ChargebackBilling implements BillingProvider {
  private readonly pool: Pool;

  constructor() {
    this.pool = new Pool({ connectionString: process.env.DATABASE_URL });
  }

  async createOrUpdateTenant(tenantId: string, metadata: Record<string, any>): Promise<void> {
    // No-op for chargeback, as tenants are managed internally.
    console.log(`[Chargeback] Tenant ${tenantId} acknowledged.`);
  }

  async invoice(tenantId: string, start: Date, end: Date): Promise<{ url?: string; bytes?: Buffer }> {
    const res = await this.pool.query(
      `SELECT feature, SUM(amount) AS units, DATE_TRUNC('day', ts) as day
       FROM usage_event 
       WHERE tenant_id = $1 AND ts >= $2 AND ts < $3 
       GROUP BY feature, day
       ORDER BY day, feature`,
      [tenantId, start, end]
    );

    if (res.rows.length === 0) {
      return { bytes: Buffer.from('date,tenant_id,feature,units\n') };
    }

    const headers = 'date,tenant_id,feature,units';
    const rows = res.rows.map(r => 
      `${new Date(r.day).toISOString().slice(0,10)},${tenantId},${r.feature},${r.units}`
    );

    const csv = [headers, ...rows].join(EOL);
    return { bytes: Buffer.from(csv, 'utf8') };
  }
}
