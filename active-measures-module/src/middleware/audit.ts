import { v4 as uuid } from 'uuid';
import { Pool } from 'pg';

// ============================================================================
// AUDIT DATABASE INTERFACE
// ============================================================================

/**
 * Audit database interface - must be implemented with PostgreSQL connection
 * Call setAuditDatabase() to inject the connection pool during app initialization.
 */
export interface AuditDatabase {
  query(query: string, params: any[]): Promise<{ rows: any[]; rowCount: number }>;
}

// Global database connection - must be initialized before use
let auditDb: AuditDatabase | null = null;

/**
 * Set the audit database connection
 * MUST be called during application initialization with a PostgreSQL pool
 */
export function setAuditDatabase(db: AuditDatabase): void {
  auditDb = db;
  console.log('[AUDIT] Audit database connection initialized');
}

function getAuditDatabase(): AuditDatabase {
  if (!auditDb) {
    throw new Error(
      'FATAL: Audit database not initialized. Call setAuditDatabase() with a ' +
      'PostgreSQL connection pool before using audit functions.'
    );
  }
  return auditDb;
}

// ============================================================================
// AUDIT MIDDLEWARE
// ============================================================================

export const auditMiddleware = {
  requestDidStart: () => ({
    willSendResponse: async ({ response, context }) => {
      if (response.data) {
        const entry = {
          id: uuid(),
          timestamp: new Date().toISOString(),
          actor: (context as any).user?.id || 'anonymous',
          action: (response as any).operationName || 'unknown',
          details: JSON.stringify(response.data),
          ip_address: (context as any).ip,
          user_agent: (context as any).userAgent,
        };

        try {
          const db = getAuditDatabase();

          // Insert audit entry into PostgreSQL
          // Schema: audit_logs (id UUID PRIMARY KEY, timestamp TIMESTAMPTZ, actor TEXT, action TEXT, details JSONB, ip_address TEXT, user_agent TEXT)
          await db.query(
            `INSERT INTO audit_logs (id, timestamp, actor, action, details, ip_address, user_agent)
             VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7)`,
            [
              entry.id,
              entry.timestamp,
              entry.actor,
              entry.action,
              entry.details,
              entry.ip_address,
              entry.user_agent,
            ]
          );

          console.log('[AUDIT] Entry logged:', {
            id: entry.id,
            actor: entry.actor,
            action: entry.action,
          });
        } catch (error) {
          // CRITICAL: Audit failures should be logged but not block the request
          console.error('[AUDIT] CRITICAL: Failed to write audit log:', {
            error: (error as Error).message,
            entry_id: entry.id,
            actor: entry.actor,
            action: entry.action,
          });

          // TODO: Send alert to monitoring system for audit failures
          // This is a compliance-critical failure that needs immediate attention
        }
      }
    },
  }),
};

/**
 * Get audit chain for a specific resource or action
 * Returns all audit entries matching the criteria
 */
export async function getAuditChain(
  resourceId?: string,
  actor?: string,
  action?: string,
  fromDate?: Date,
  toDate?: Date
): Promise<any[]> {
  const db = getAuditDatabase();

  let query = 'SELECT * FROM audit_logs WHERE 1=1';
  const params: any[] = [];
  let paramIndex = 1;

  // Build dynamic query based on filters
  if (resourceId) {
    query += ` AND details->>'id' = $${paramIndex}`;
    params.push(resourceId);
    paramIndex++;
  }

  if (actor) {
    query += ` AND actor = $${paramIndex}`;
    params.push(actor);
    paramIndex++;
  }

  if (action) {
    query += ` AND action = $${paramIndex}`;
    params.push(action);
    paramIndex++;
  }

  if (fromDate) {
    query += ` AND timestamp >= $${paramIndex}`;
    params.push(fromDate.toISOString());
    paramIndex++;
  }

  if (toDate) {
    query += ` AND timestamp <= $${paramIndex}`;
    params.push(toDate.toISOString());
    paramIndex++;
  }

  query += ' ORDER BY timestamp ASC';

  try {
    const result = await db.query(query, params);
    return result.rows;
  } catch (error) {
    console.error('[AUDIT] Failed to retrieve audit chain:', {
      error: (error as Error).message,
      filters: { resourceId, actor, action },
    });
    throw error;
  }
}

/**
 * Verify audit chain integrity
 * Checks for gaps, tampering, or anomalies in the audit trail
 */
export async function verifyAuditIntegrity(
  fromDate: Date,
  toDate: Date
): Promise<{
  valid: boolean;
  totalEntries: number;
  gaps: any[];
  anomalies: any[];
}> {
  const db = getAuditDatabase();

  try {
    // Get count of entries in time range
    const countResult = await db.query(
      'SELECT COUNT(*) as total FROM audit_logs WHERE timestamp >= $1 AND timestamp <= $2',
      [fromDate.toISOString(), toDate.toISOString()]
    );

    const totalEntries = parseInt(countResult.rows[0].total, 10);

    // Check for sequential timestamp gaps > 1 hour (potential tampering)
    const gapResult = await db.query(
      `SELECT
         lag(timestamp) OVER (ORDER BY timestamp) as prev_timestamp,
         timestamp as curr_timestamp,
         EXTRACT(EPOCH FROM (timestamp - lag(timestamp) OVER (ORDER BY timestamp))) as gap_seconds
       FROM audit_logs
       WHERE timestamp >= $1 AND timestamp <= $2
       HAVING EXTRACT(EPOCH FROM (timestamp - lag(timestamp) OVER (ORDER BY timestamp))) > 3600`,
      [fromDate.toISOString(), toDate.toISOString()]
    );

    const gaps = gapResult.rows;

    // TODO: Add cryptographic hash chain verification
    // TODO: Add anomaly detection for unusual patterns

    return {
      valid: gaps.length === 0,
      totalEntries,
      gaps,
      anomalies: [],
    };
  } catch (error) {
    console.error('[AUDIT] Failed to verify audit integrity:', {
      error: (error as Error).message,
    });
    throw error;
  }
}

export default {
  auditMiddleware,
  getAuditChain,
  verifyAuditIntegrity,
  setAuditDatabase,
};
