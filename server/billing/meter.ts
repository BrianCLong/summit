import client from 'prom-client';
import { getPool } from '../db/connect.js';

export const usage = new client.Counter({ 
  name: 'usage_api_calls', 
  help: 'API calls', 
  labelNames: ['tenant', 'plan'] 
});

export const quotaUsageGauge = new client.Gauge({
  name: 'quota_usage',
  help: 'Current quota usage by tenant and metric',
  labelNames: ['tenant', 'plan', 'quota_key']
});

export async function recordUsage(
  db: any, 
  tenantId: string, 
  plan: string = 'starter',
  key: string = 'api_calls_per_day'
) {
  try {
    // Update quota usage in database
    await db.query(`
      INSERT INTO quota_usage(tenant_id, key, period, used) 
      VALUES($1, $2, current_date, 1)
      ON CONFLICT (tenant_id, key, period) 
      DO UPDATE SET used = quota_usage.used + 1
    `, [tenantId, key]);
    
    // Update Prometheus metrics
    usage.inc({ tenant: tenantId, plan });
    
    // Update quota gauge
    const result = await db.query(`
      SELECT used FROM quota_usage 
      WHERE tenant_id = $1 AND key = $2 AND period = current_date
    `, [tenantId, key]);
    
    if (result.rows.length > 0) {
      quotaUsageGauge.set(
        { tenant: tenantId, plan, quota_key: key }, 
        result.rows[0].used
      );
    }
    
  } catch (error) {
    console.error('Failed to record usage:', error);
    // Still update Prometheus metrics even if DB fails
    usage.inc({ tenant: tenantId, plan });
  }
}

export async function getUsageForTenant(tenantId: string, key: string = 'api_calls_per_day') {
  const pool = getPool();
  const client = await pool.connect();
  
  try {
    const result = await client.query(`
      SELECT used, period FROM quota_usage 
      WHERE tenant_id = $1 AND key = $2 AND period = current_date
    `, [tenantId, key]);
    
    return result.rows.length > 0 ? result.rows[0].used : 0;
  } finally {
    client.release();
  }
}

export async function checkQuotaExceeded(tenantId: string, plan: string, key: string = 'api_calls_per_day') {
  const pool = getPool();
  const client = await pool.connect();
  
  try {
    const [quotaResult, usageResult] = await Promise.all([
      client.query('SELECT * FROM quota_def WHERE key = $1', [key]),
      client.query(`
        SELECT used FROM quota_usage 
        WHERE tenant_id = $1 AND key = $2 AND period = current_date
      `, [tenantId, key])
    ]);
    
    if (quotaResult.rows.length === 0) {
      return false; // No quota defined
    }
    
    const quota = quotaResult.rows[0];
    const limit = quota[plan] || quota.starter; // Fallback to starter
    const used = usageResult.rows.length > 0 ? usageResult.rows[0].used : 0;
    
    return used >= limit;
  } finally {
    client.release();
  }
}