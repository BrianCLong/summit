import type { Response, NextFunction } from 'express';
import type { TenantRequest } from './tenant.js';
import { logger } from '../utils/logger.js';
import { db } from '../utils/db.js';
import { v4 as uuidv4 } from 'uuid';

export interface AuditEntry {
  id: string;
  tenantId: string;
  userId: string | null;
  action: string;
  resourceType: string;
  resourceId: string | null;
  details: Record<string, unknown>;
  ipAddress: string | null;
  userAgent: string | null;
  timestamp: string;
}

/**
 * Log an audit entry for financial operations
 */
export async function logAudit(
  tenantId: string,
  userId: string | null,
  action: string,
  resourceType: string,
  resourceId: string | null,
  details: Record<string, unknown>,
  ipAddress?: string | null,
  userAgent?: string | null
): Promise<void> {
  const entry: AuditEntry = {
    id: uuidv4(),
    tenantId,
    userId,
    action,
    resourceType,
    resourceId,
    details,
    ipAddress: ipAddress || null,
    userAgent: userAgent || null,
    timestamp: new Date().toISOString(),
  };

  try {
    await db.query(
      `INSERT INTO finance_audit_log (
        id, tenant_id, user_id, action, resource_type, resource_id,
        details, ip_address, user_agent, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        entry.id,
        entry.tenantId,
        entry.userId,
        entry.action,
        entry.resourceType,
        entry.resourceId,
        JSON.stringify(entry.details),
        entry.ipAddress,
        entry.userAgent,
        entry.timestamp,
      ]
    );
  } catch (error) {
    // Log but don't fail the request if audit logging fails
    logger.error('Failed to write audit log', {
      error: error instanceof Error ? error.message : 'Unknown',
      entry,
    });
  }
}

/**
 * Middleware to automatically audit API operations
 */
export function auditMiddleware(action: string, resourceType: string) {
  return async (
    req: TenantRequest,
    _res: Response,
    next: NextFunction
  ): Promise<void> => {
    const resourceId = req.params.id || null;

    await logAudit(
      req.tenantId,
      req.userId || null,
      action,
      resourceType,
      resourceId,
      {
        method: req.method,
        path: req.path,
        query: req.query,
        bodyKeys: Object.keys(req.body || {}),
      },
      req.ip,
      req.get('user-agent')
    );

    next();
  };
}
