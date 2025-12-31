/**
 * Active Measures Module - Audit Utility
 * Service-level audit logging with PostgreSQL persistence
 *
 * ✅ SCAFFOLD ELIMINATED: Replaced console.log placeholder with real database persistence
 */

import { v4 as uuidv4 } from 'uuid';

/**
 * Audit database interface (PostgreSQL)
 */
export interface AuditDatabase {
  query(text: string, params: any[]): Promise<{ rows: any[]; rowCount: number }>;
}

/**
 * Audit log entry structure
 */
export interface AuditEntry {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  details: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  tenant_id?: string;
  resource_type?: string;
  resource_id?: string;
  outcome?: 'success' | 'failure' | 'error';
  error_message?: string;
}

/**
 * Audit logging options
 */
export interface AuditOptions {
  ipAddress?: string;
  userAgent?: string;
  tenantId?: string;
  resourceType?: string;
  resourceId?: string;
  outcome?: 'success' | 'failure' | 'error';
  errorMessage?: string;
}

// Module-level database reference
let auditDatabase: AuditDatabase | null = null;

/**
 * Initialize audit database connection
 * MUST be called during application startup before any audit logging
 *
 * @param db - PostgreSQL database connection pool
 */
export function setAuditDatabase(db: AuditDatabase): void {
  auditDatabase = db;
  console.log('[AUDIT] Audit database initialized for active-measures utility');
}

/**
 * Get audit database connection
 * @throws Error if database not initialized
 */
function getAuditDatabase(): AuditDatabase {
  if (!auditDatabase) {
    throw new Error(
      'FATAL: Audit database not initialized. ' +
      'Call setAuditDatabase(db) during application startup. ' +
      'Audit logging cannot proceed without database persistence.'
    );
  }
  return auditDatabase;
}

/**
 * Log audit entry to database
 *
 * ✅ SECURITY FIX: Replaced console.log with PostgreSQL persistence
 *
 * PREVIOUS VULNERABILITY:
 * - Only logged to console.log (line 10)
 * - Comment said "Insert to DB (placeholder)" (line 9)
 * - All audit entries lost (compliance violation)
 * - No error handling
 * - No database integration
 *
 * NEW SECURE APPROACH:
 * - Persists to PostgreSQL audit_logs table
 * - Parameterized SQL queries (injection-safe)
 * - Error handling with logging
 * - Returns audit entry ID for correlation
 * - Throws on failure to ensure audit failures are noticed
 *
 * @param actor - User or system performing the action
 * @param action - Action being performed
 * @param details - Additional details about the action
 * @param options - Optional audit metadata
 * @returns Audit entry ID
 * @throws Error if database write fails
 */
export async function logAudit(
  actor: string,
  action: string,
  details: Record<string, any>,
  options: AuditOptions = {},
): Promise<string> {
  const db = getAuditDatabase();

  const entry: AuditEntry = {
    id: uuidv4(),
    timestamp: new Date().toISOString(),
    actor,
    action,
    details,
    ip_address: options.ipAddress,
    user_agent: options.userAgent,
    tenant_id: options.tenantId,
    resource_type: options.resourceType,
    resource_id: options.resourceId,
    outcome: options.outcome || 'success',
    error_message: options.errorMessage,
  };

  try {
    // Insert audit entry to PostgreSQL
    await db.query(
      `INSERT INTO audit_logs (
        id, timestamp, actor, action, details,
        ip_address, user_agent, tenant_id,
        resource_type, resource_id, outcome, error_message
      ) VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7, $8, $9, $10, $11, $12)`,
      [
        entry.id,
        entry.timestamp,
        entry.actor,
        entry.action,
        JSON.stringify(entry.details),
        entry.ip_address,
        entry.user_agent,
        entry.tenant_id,
        entry.resource_type,
        entry.resource_id,
        entry.outcome,
        entry.error_message,
      ]
    );

    console.log(
      `[AUDIT] Entry logged: actor=${actor}, action=${action}, ` +
      `id=${entry.id}, outcome=${entry.outcome}`
    );

    return entry.id;
  } catch (error) {
    // CRITICAL: Audit write failures must be noticed
    console.error(
      `[AUDIT] CRITICAL: Failed to write audit entry to database. ` +
      `Actor=${actor}, action=${action}, error=${error instanceof Error ? error.message : 'Unknown'}`,
      error
    );

    // Re-throw to ensure audit failures propagate
    throw new Error(
      `Audit logging failed for action ${action} by ${actor}: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Log successful action
 *
 * @param actor - User or system performing the action
 * @param action - Action being performed
 * @param details - Additional details
 * @param options - Optional audit metadata
 * @returns Audit entry ID
 */
export async function logSuccess(
  actor: string,
  action: string,
  details: Record<string, any>,
  options: AuditOptions = {},
): Promise<string> {
  return logAudit(actor, action, details, {
    ...options,
    outcome: 'success',
  });
}

/**
 * Log failed action
 *
 * @param actor - User or system performing the action
 * @param action - Action that failed
 * @param error - Error that occurred
 * @param details - Additional details
 * @param options - Optional audit metadata
 * @returns Audit entry ID
 */
export async function logFailure(
  actor: string,
  action: string,
  error: Error | string,
  details: Record<string, any> = {},
  options: AuditOptions = {},
): Promise<string> {
  const errorMessage = error instanceof Error ? error.message : error;

  return logAudit(actor, action, details, {
    ...options,
    outcome: 'failure',
    errorMessage,
  });
}

/**
 * Query audit logs by criteria
 *
 * @param criteria - Query criteria
 * @param limit - Maximum results to return
 * @param offset - Offset for pagination
 * @returns Audit log entries
 */
export async function queryAuditLogs(
  criteria: {
    actor?: string;
    action?: string;
    tenantId?: string;
    resourceType?: string;
    resourceId?: string;
    outcome?: 'success' | 'failure' | 'error';
    startTime?: Date;
    endTime?: Date;
  },
  limit: number = 100,
  offset: number = 0,
): Promise<AuditEntry[]> {
  const db = getAuditDatabase();

  let query = 'SELECT * FROM audit_logs WHERE 1=1';
  const params: any[] = [];
  let paramIndex = 1;

  if (criteria.actor) {
    query += ` AND actor = $${paramIndex}`;
    params.push(criteria.actor);
    paramIndex++;
  }

  if (criteria.action) {
    query += ` AND action = $${paramIndex}`;
    params.push(criteria.action);
    paramIndex++;
  }

  if (criteria.tenantId) {
    query += ` AND tenant_id = $${paramIndex}`;
    params.push(criteria.tenantId);
    paramIndex++;
  }

  if (criteria.resourceType) {
    query += ` AND resource_type = $${paramIndex}`;
    params.push(criteria.resourceType);
    paramIndex++;
  }

  if (criteria.resourceId) {
    query += ` AND resource_id = $${paramIndex}`;
    params.push(criteria.resourceId);
    paramIndex++;
  }

  if (criteria.outcome) {
    query += ` AND outcome = $${paramIndex}`;
    params.push(criteria.outcome);
    paramIndex++;
  }

  if (criteria.startTime) {
    query += ` AND timestamp >= $${paramIndex}`;
    params.push(criteria.startTime.toISOString());
    paramIndex++;
  }

  if (criteria.endTime) {
    query += ` AND timestamp <= $${paramIndex}`;
    params.push(criteria.endTime.toISOString());
    paramIndex++;
  }

  query += ` ORDER BY timestamp DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
  params.push(limit, offset);

  try {
    const result = await db.query(query, params);

    return result.rows.map((row) => ({
      id: row.id,
      timestamp: row.timestamp,
      actor: row.actor,
      action: row.action,
      details: typeof row.details === 'string' ? JSON.parse(row.details) : row.details,
      ip_address: row.ip_address,
      user_agent: row.user_agent,
      tenant_id: row.tenant_id,
      resource_type: row.resource_type,
      resource_id: row.resource_id,
      outcome: row.outcome,
      error_message: row.error_message,
    }));
  } catch (error) {
    console.error('[AUDIT] Query failed:', error);
    throw new Error(
      `Audit query failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Get audit statistics
 *
 * @param tenantId - Optional tenant filter
 * @param startTime - Optional start time filter
 * @param endTime - Optional end time filter
 * @returns Audit statistics
 */
export async function getAuditStats(
  tenantId?: string,
  startTime?: Date,
  endTime?: Date,
): Promise<{
  totalEntries: number;
  successCount: number;
  failureCount: number;
  errorCount: number;
  topActors: Array<{ actor: string; count: number }>;
  topActions: Array<{ action: string; count: number }>;
}> {
  const db = getAuditDatabase();

  let whereClause = 'WHERE 1=1';
  const params: any[] = [];
  let paramIndex = 1;

  if (tenantId) {
    whereClause += ` AND tenant_id = $${paramIndex}`;
    params.push(tenantId);
    paramIndex++;
  }

  if (startTime) {
    whereClause += ` AND timestamp >= $${paramIndex}`;
    params.push(startTime.toISOString());
    paramIndex++;
  }

  if (endTime) {
    whereClause += ` AND timestamp <= $${paramIndex}`;
    params.push(endTime.toISOString());
    paramIndex++;
  }

  try {
    // Get counts by outcome
    const countsResult = await db.query(
      `SELECT
        COUNT(*) as total,
        COUNT(CASE WHEN outcome = 'success' THEN 1 END) as success,
        COUNT(CASE WHEN outcome = 'failure' THEN 1 END) as failure,
        COUNT(CASE WHEN outcome = 'error' THEN 1 END) as error
      FROM audit_logs ${whereClause}`,
      params
    );

    // Get top actors
    const actorsResult = await db.query(
      `SELECT actor, COUNT(*) as count
      FROM audit_logs ${whereClause}
      GROUP BY actor
      ORDER BY count DESC
      LIMIT 10`,
      params
    );

    // Get top actions
    const actionsResult = await db.query(
      `SELECT action, COUNT(*) as count
      FROM audit_logs ${whereClause}
      GROUP BY action
      ORDER BY count DESC
      LIMIT 10`,
      params
    );

    return {
      totalEntries: parseInt(countsResult.rows[0]?.total || '0'),
      successCount: parseInt(countsResult.rows[0]?.success || '0'),
      failureCount: parseInt(countsResult.rows[0]?.failure || '0'),
      errorCount: parseInt(countsResult.rows[0]?.error || '0'),
      topActors: actorsResult.rows.map((row) => ({
        actor: row.actor,
        count: parseInt(row.count),
      })),
      topActions: actionsResult.rows.map((row) => ({
        action: row.action,
        count: parseInt(row.count),
      })),
    };
  } catch (error) {
    console.error('[AUDIT] Stats query failed:', error);
    throw new Error(
      `Audit stats query failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}
