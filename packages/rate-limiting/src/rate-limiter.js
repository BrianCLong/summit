"use strict";
/**
 * Rate Limiter - Main Class
 *
 * Coordinates rate limiting strategies and policies
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.RateLimiter = void 0;
const logger_js_1 = require("./utils/logger.js");
const logger = (0, logger_js_1.createLogger)('rate-limiter');
class RateLimiter {
    config;
    constructor(config) {
        this.config = {
            keyPrefix: 'ratelimit',
            skipFailedRequests: false,
            skipSuccessfulRequests: false,
            ...config,
        };
    }
    getKey(identifier) {
        return `${this.config.keyPrefix}:${identifier}`;
    }
    logRateLimit(key, result) {
        if (!result.allowed) {
            logger.warn('Rate limit exceeded', {
                key,
                limit: result.info.limit,
                current: result.info.current,
                resetTime: new Date(result.info.resetTime),
            });
        }
        else {
            logger.debug('Rate limit check passed', {
                key,
                remaining: result.info.remaining,
            });
        }
    }
}
exports.RateLimiter = RateLimiter;
