"use strict";
/**
 * Timeout Policy Middleware
 *
 * Manages request timeouts with configurable policies
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TimeoutError = exports.TimeoutPolicy = void 0;
const logger_js_1 = require("../utils/logger.js");
const logger = (0, logger_js_1.createLogger)('timeout-policy');
class TimeoutPolicy {
    config;
    constructor(config) {
        this.config = {
            default: 30000,
            connect: 5000,
            read: 30000,
            write: 30000,
            ...config,
        };
    }
    getTimeout(route) {
        if (route && this.config.perRoute?.has(route)) {
            return this.config.perRoute.get(route);
        }
        return this.config.default;
    }
    async executeWithTimeout(operation, timeoutMs, context) {
        const timeout = timeoutMs || this.config.default;
        return Promise.race([
            operation(),
            this.createTimeoutPromise(timeout, context),
        ]);
    }
    createTimeoutPromise(ms, context) {
        return new Promise((_, reject) => {
            setTimeout(() => {
                logger.error('Request timeout', { timeout: ms, context });
                reject(new TimeoutError(`Request timeout after ${ms}ms`, ms));
            }, ms);
        });
    }
    setRouteTimeout(route, timeout) {
        if (!this.config.perRoute) {
            this.config.perRoute = new Map();
        }
        this.config.perRoute.set(route, timeout);
    }
    getConfig() {
        return { ...this.config };
    }
}
exports.TimeoutPolicy = TimeoutPolicy;
class TimeoutError extends Error {
    timeout;
    constructor(message, timeout) {
        super(message);
        this.timeout = timeout;
        this.name = 'TimeoutError';
    }
}
exports.TimeoutError = TimeoutError;
