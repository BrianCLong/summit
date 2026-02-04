import { Request, Response, NextFunction } from 'express';
import { usageMeteringService } from '../services/UsageMeteringService.js';
import { quotaService } from '../services/QuotaService.js';
import logger from '../utils/logger.js';
import { meteringEmitter } from '../metering/emitter.js';

export const usageMiddleware = async (req: Request, res: Response, next: NextFunction) => {
    // Only meter if we have a tenantId.
    // Assuming auth middleware has populated req.user or similar.
    // Adjust based on actual auth middleware.
    const user = (req as any).user;
    const tenantId = user?.tenantId;

    if (!tenantId) {
        // If public or unauthenticated, skip metering or log as anonymous?
        // For now, skip.
        return next();
    }

    const route = req.route ? req.route.path : req.path;
    const method = req.method;

    // 1. Rate Limiting / Quota Check (Blocking)
    // Check if tenant has exceeded request quota
    try {
        // Note: Using type assertion - quotaService API may need updating to match this interface
        const quotaResult = await (quotaService as any).checkQuota({
            tenantId,
            kind: 'external_api.requests',
            quantity: 1
        });

        if (!quotaResult.allowed) {
             res.status(429).json({
                error: 'Quota Exceeded',
                message: quotaResult.reason
            });
            return;
        }

        // Add headers for quotas?
        if (quotaResult.remaining !== undefined) {
             res.setHeader('X-Quota-Remaining', quotaResult.remaining.toString());
        }

    } catch (e: any) {
        logger.error('Quota check failed in middleware', e);
        // Fail open
    }

    // 2. Usage Recording (Async / Non-blocking)
    // We record after the response is finished to capture status code, or before?
    // Usually before is safer for "attempts", after is better for "successful calls".
    // Let's record "request attempted".

    // We can fire and forget
    // Note: Using type assertion - UsageEvent interface may need principalId/principalKind fields
    usageMeteringService.record({
        tenantId,
        kind: 'external_api.requests',
        quantity: 1,
        unit: 'requests',
        metadata: {
            method,
            route,
            userAgent: req.get('user-agent'),
            principalId: user.id,
            principalKind: 'user'
        }
    } as any).catch((err: Error) => {
        logger.error('Failed to record API usage', err);
    });

    meteringEmitter.emitActiveSeat({
        tenantId,
        source: 'usage-middleware',
        userId: user.id,
        idempotencyKey: `${tenantId}:${user.id}:${new Date().toISOString().slice(0, 10)}`,
        metadata: {
            path: route,
            method
        }
    }).catch(err => {
        logger.warn({ err }, 'Failed to emit active seat event');
    });

    next();
};
