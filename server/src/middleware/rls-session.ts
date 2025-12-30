import { performance } from 'node:perf_hooks';
import { NextFunction, Request, Response } from 'express';
import logger from '../config/logger.js';
import {
  getRlsContext,
  isRlsFeatureFlagEnabled,
  runWithRlsContext,
  updateCaseContext,
} from '../security/rlsContext.js';

const rlsLogger = logger.child({ name: 'rls-session' });

interface RlsMiddlewareOptions {
  trackedPrefixes?: string[];
  stagingOnly?: boolean;
}

const DEFAULT_PREFIXES = ['/api/cases', '/api/case-tasks', '/api/case-workflow'];

export const rlsSessionMiddleware =
  (options: RlsMiddlewareOptions = {}) =>
  (req: Request, res: Response, next: NextFunction) => {
    if (!isRlsFeatureFlagEnabled()) {
      return next();
    }

    if (options.stagingOnly !== false && process.env.NODE_ENV !== 'staging') {
      return next();
    }

    const prefixes = options.trackedPrefixes ?? DEFAULT_PREFIXES;
    const isTracked = prefixes.some((prefix) => req.path?.startsWith(prefix));
    if (!isTracked) {
      return next();
    }

    const tenantId =
      (req.headers['x-tenant-id'] as string) ||
      (req.headers['x-tenant'] as string) ||
      (req as any).user?.tenant_id ||
      (req as any).user?.tenantId;

    const caseId =
      (req.params?.caseId as string) ||
      (req.params?.id as string) ||
      (req.headers['x-case-id'] as string);

    const start = performance.now();

    runWithRlsContext(
      {
        tenantId: tenantId || undefined,
        caseId: caseId || undefined,
        enabled: true,
        path: req.path,
        method: req.method,
        overheadMs: 0,
      },
      () => {
        res.once('finish', () => {
          const ctx = getRlsContext();
          if (!ctx?.enabled) {return;}

          const overheadMs = ctx.overheadMs ?? 0;
          const elapsedMs = performance.now() - start;
          rlsLogger.debug(
            {
              tenantId: ctx.tenantId,
              caseId: ctx.caseId,
              path: ctx.path,
              method: ctx.method,
              overheadMs,
              elapsedMs,
            },
            'RLS session applied for tracked route',
          );
        });

        updateCaseContext(caseId || undefined);
        next();
      },
    );
  };

export default rlsSessionMiddleware;
