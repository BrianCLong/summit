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
        await quotaService.assert({
            tenantId,
            dimension: 'api.calls',
            quantity: 1
        });
    } catch (e: any) {
        if (e.name === 'QuotaExceededException') {
            return res.status(429).json({
                error: 'Quota Exceeded',
                message: e.message
            });
        }
        logger.error('Quota check failed in middleware', e);
        // Fail open
    }

    // 2. Usage Recording (Async / Non-blocking)
    // Send event to metering system
    const timestamp = new Date().toISOString();
    usageMeteringService.record({
        id: `usage_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        tenantId,
        dimension: 'api.calls',
        quantity: 1,
        unit: 'request',
        source: 'usageMiddleware',
        metadata: {
            method,
            route,
            ip: req.ip,
            userId: user.id
        },
        occurredAt: timestamp,
        recordedAt: timestamp
    }).catch(err => {
        logger.error('Failed to record usage', err);
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
