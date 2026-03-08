import { Request, Response, NextFunction } from 'express';
import { quotaManager, QuotaConfig } from './quotas.js';
import { meteringEmitter } from './emitter.js';
import logger from '../utils/logger.js';

// Feature flag for hard enforcement. Default OFF (warn-only).
const ENFORCE_QUOTAS = process.env.ENFORCE_QUOTAS === 'true';

export const requestMeteringMiddleware = (req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();

    // Hook into response finish to capture accurate status and duration
    res.on('finish', () => {
        const tenantId = (req as any).user?.tenantId;
        if (tenantId) {
            meteringEmitter.emitApiRequest({
                tenantId,
                source: 'api-middleware',
                method: req.method,
                endpoint: req.path,
                statusCode: res.statusCode,
                metadata: {
                    durationMs: Date.now() - start
                }
            }).catch(err => {
                logger.warn({ error: err }, 'Failed to emit api request meter event');
            });
        }
    });

    next();
};

export const checkQuotaMiddleware = (metric: keyof QuotaConfig, cost: number = 1) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tenantId = (req as any).user?.tenantId;
      if (!tenantId) {
        // If no tenant context, we can't enforce quota. Skip.
        next();
        return;
      }

      const result = await quotaManager.checkQuota(tenantId, metric, cost);

      if (result.softExceeded) {
        logger.warn({ tenantId, metric, message: result.message }, 'Quota soft limit exceeded');
        // Add header for client visibility
        res.setHeader('X-Quota-Warning', result.message || 'Quota exceeded');
      }

      if (!result.allowed) {
        if (ENFORCE_QUOTAS) {
           logger.warn({ tenantId, metric }, 'Quota hard limit exceeded, blocking request');
           res.status(429).json({ error: 'Quota exceeded', message: result.message });
           return;
        } else {
            logger.info({ tenantId, metric }, 'Quota hard limit exceeded but enforcement is OFF');
        }
      }

      next();
    } catch (error: any) {
      logger.error({ error }, 'Error in quota middleware');
      next(); // Fail open to avoid blocking due to system error
    }
  };
};
