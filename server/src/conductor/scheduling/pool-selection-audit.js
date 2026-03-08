"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.recordPoolSelectionAudit = recordPoolSelectionAudit;
const pg_1 = require("pg");
let auditPool = null;
function getAuditPool() {
    if (!process.env.DATABASE_URL) {
        return null;
    }
    if (!auditPool) {
        auditPool = new pg_1.Pool({ connectionString: process.env.DATABASE_URL });
    }
    return auditPool;
}
async function recordPoolSelectionAudit(entry) {
    const pool = getAuditPool();
    if (!pool) {
        console.warn('Pool selection audit skipped: DATABASE_URL not configured');
        return;
    }
    try {
        await pool.query(`INSERT INTO pool_selection_audit
        (tenant_id, request_id, pool_id, pool_price_usd, residency, est, purpose)
      VALUES ($1, $2, $3, $4, $5, $6, $7)`, [
            entry.tenantId,
            entry.requestId,
            entry.poolId || null,
            entry.poolPriceUsd ?? null,
            entry.residency || null,
            JSON.stringify(entry.est || {}),
            entry.purpose || null,
        ]);
    }
    catch (error) {
        console.warn('Failed to record pool selection audit', {
            error: error instanceof Error ? error.message : error,
            requestId: entry.requestId,
            tenantId: entry.tenantId,
        });
    }
}
