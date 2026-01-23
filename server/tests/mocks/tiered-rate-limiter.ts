import { jest } from '@jest/globals';

export const RateLimitTier = {
    FREE: 'free',
    BASIC: 'basic',
    PREMIUM: 'premium',
    ENTERPRISE: 'enterprise',
    INTERNAL: 'internal'
};

export const RequestPriority = {
    LOW: 'low',
    NORMAL: 'normal',
    HIGH: 'high',
    CRITICAL: 'critical'
};

export const advancedRateLimiter = {
    middleware: jest.fn(() => (req: any, res: any, next: any) => {
        if (next) next();
    }),
    getStatus: jest.fn().mockResolvedValue({ status: 'ok' }),
    isRateLimited: jest.fn().mockResolvedValue(false),
    increment: jest.fn().mockResolvedValue(undefined),
    reset: jest.fn().mockResolvedValue(true),
};

export default {
    advancedRateLimiter,
    RateLimitTier,
    RequestPriority
};
