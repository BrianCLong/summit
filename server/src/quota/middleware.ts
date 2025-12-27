import { NextFunction, Request, Response } from 'express';
import { quotaService } from './service';

const getTenantId = (req: Request): string => {
  return (
    (req.headers['x-tenant-id'] as string) ||
    (req as any).tenantId ||
    (req as any).user?.tenantId ||
    'default'
  );
};

const reject = (res: Response, status: number, reason: string, retryAfterMs?: number) => {
  const payload: Record<string, unknown> = {
    error: 'QUOTA_EXCEEDED',
    reason,
  };
  if (retryAfterMs !== undefined) {
    payload.retryAfterMs = retryAfterMs;
  }
  return res.status(status).json(payload);
};

export const quotaMiddleware = (req: Request, res: Response, next: NextFunction) => {
  if (!quotaService.isEnabled()) {
    return next();
  }

  const tenantId = getTenantId(req);
  const result = quotaService.checkApiRequest(tenantId);
  if (!result.allowed) {
    return reject(res, 429, result.reason ?? 'api_rate_exceeded', result.retryAfterMs);
  }

  res.setHeader('X-RateLimit-Limit', result.limit);
  res.setHeader('X-RateLimit-Remaining', Math.max(0, result.remaining));
  return next();
};

export const quotaGuards = {
  checkEvidenceFinalize: (
    tenantId: string,
    evidenceId: string,
    sizeBytes?: number,
  ) => quotaService.checkEvidence(tenantId, evidenceId, sizeBytes),
  checkExportCreation: (tenantId: string, exportId: string) =>
    quotaService.checkExport(tenantId, exportId),
  checkJobEnqueue: (tenantId: string, jobKey?: string) =>
    quotaService.checkJobEnqueue(tenantId, jobKey),
  completeJob: (tenantId: string, delta?: number) => quotaService.completeJob(tenantId, delta ?? 1),
  checkStorageBytes: (tenantId: string, bytes: number, fingerprint?: string) =>
    quotaService.checkStorageBytes(tenantId, bytes, fingerprint),
};
