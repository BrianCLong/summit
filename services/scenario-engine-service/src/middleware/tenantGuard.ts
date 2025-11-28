/**
 * Tenant Guard Middleware
 * Ensures tenant isolation and non-production environment
 */

import { Request, Response, NextFunction } from 'express';
import { ProductionDataGuardError } from '../types/index.js';

export interface TenantRequest extends Request {
  tenantId: string;
  userId: string;
}

/**
 * Extract and validate tenant from request
 */
export function tenantGuard(req: Request, res: Response, next: NextFunction): void {
  // Extract tenant from header or query
  const tenantId = req.headers['x-tenant-id'] as string || req.query.tenantId as string;
  const userId = req.headers['x-user-id'] as string || req.query.userId as string || 'anonymous';

  if (!tenantId) {
    res.status(400).json({
      error: 'Tenant ID required',
      code: 'MISSING_TENANT_ID',
      message: 'X-Tenant-Id header or tenantId query parameter is required',
    });
    return;
  }

  // Validate non-production scope
  const environment = req.headers['x-environment'] as string;
  if (environment === 'production') {
    const error = new ProductionDataGuardError(
      'Scenario engine cannot operate in production environment'
    );
    res.status(403).json({
      error: error.message,
      code: error.code,
    });
    return;
  }

  (req as TenantRequest).tenantId = tenantId;
  (req as TenantRequest).userId = userId;
  next();
}

/**
 * Validate scenario access
 */
export function scenarioAccessGuard(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const tenantReq = req as TenantRequest;
  const scenarioTenantId = req.params.tenantId || req.body?.tenantId;

  if (scenarioTenantId && scenarioTenantId !== tenantReq.tenantId) {
    res.status(403).json({
      error: 'Access denied',
      code: 'TENANT_MISMATCH',
      message: 'Cannot access scenarios from different tenant',
    });
    return;
  }

  next();
}
