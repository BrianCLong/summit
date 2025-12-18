import { Request, Response, NextFunction } from 'express';
import UsageMeteringService from '../services/UsageMeteringService.js';
import QuotaService from '../services/QuotaService.js';
import logger from '../utils/logger.js';

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
        const quotaResult = await QuotaService.checkQuota({
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

    } catch (e) {
        logger.error('Quota check failed in middleware', e);
        // Fail open
    }

    // 2. Usage Recording (Async / Non-blocking)
    // We record after the response is finished to capture status code, or before?
    // Usually before is safer for "attempts", after is better for "successful calls".
    // Let's record "request attempted".

    // We can fire and forget
    UsageMeteringService.record({
        tenantId,
        principalId: user.id,
        principalKind: 'user', // or api_key
        kind: 'external_api.requests',
        quantity: 1,
        unit: 'requests',
        metadata: {
            method,
            route,
            userAgent: req.get('user-agent')
        }
    }).catch(err => {
        logger.error('Failed to record API usage', err);
    });

    next();
};
