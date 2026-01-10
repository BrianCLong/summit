import { Pool } from 'pg';

type PoolSelectionAuditEntry = {
  tenantId: string;
  requestId: string;
  poolId?: string;
  poolPriceUsd?: number;
  residency?: string;
  est?: { cpuSec?: number; gbSec?: number; egressGb?: number };
  purpose?: string;
};

let auditPool: Pool | null = null;

function getAuditPool(): Pool | null {
  if (!process.env.DATABASE_URL) {
    return null;
  }

  if (!auditPool) {
    auditPool = new Pool({ connectionString: process.env.DATABASE_URL });
  }

  return auditPool;
}

export async function recordPoolSelectionAudit(
  entry: PoolSelectionAuditEntry,
): Promise<void> {
  const pool = getAuditPool();

  if (!pool) {
    console.warn('Pool selection audit skipped: DATABASE_URL not configured');
    return;
  }

  try {
    await pool.query(
      `INSERT INTO pool_selection_audit
        (tenant_id, request_id, pool_id, pool_price_usd, residency, est, purpose)
      VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        entry.tenantId,
        entry.requestId,
        entry.poolId || null,
        entry.poolPriceUsd ?? null,
        entry.residency || null,
        JSON.stringify(entry.est || {}),
        entry.purpose || null,
      ],
    );
  } catch (error: any) {
    console.warn('Failed to record pool selection audit', {
      error: error instanceof Error ? error.message : error,
      requestId: entry.requestId,
      tenantId: entry.tenantId,
    });
  }
}
