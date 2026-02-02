import { Request, Response, NextFunction } from 'express';
import { shadowService, ShadowConfig } from '../services/ShadowService.js';
import { REGIONAL_CONFIG, getCurrentRegion } from '../config/regional-config.js';

// Global shadow configuration (could be moved to DB)
let shadowConfig: Record<string, ShadowConfig> = {};

export const setShadowConfig = (tenantId: string, config: ShadowConfig | null) => {
    if (config === null) {
        delete shadowConfig[tenantId];
    } else {
        shadowConfig[tenantId] = config;
    }
};

export const shadowTrafficMiddleware = (req: Request, res: Response, next: NextFunction) => {
    const tenantId = (req as any).user?.tenantId || (req as any).tenantId;

    if (!tenantId || !shadowConfig[tenantId]) {
        return next();
    }

    const config = shadowConfig[tenantId];

    // Sampling check
    if (Math.random() > config.samplingRate) {
        return next();
    }

    // Identify shadow request to avoid infinite loops
    if (req.headers['x-summit-shadow-request'] === 'true') {
        return next();
    }

    // Capture request and shadow it
    // We do this AFTER next() or concurrently. Usually fire-and-forget before next()
    // but capturing the body might need to be careful with streams.
    // Express json() middleware should have already parsed the body.

    shadowService.shadow({
        method: req.method,
        url: req.originalUrl,
        headers: req.headers,
        body: req.body
    }, config);

    next();
};
