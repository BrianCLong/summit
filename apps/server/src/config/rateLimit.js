"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRateLimiter = void 0;
const express_rate_limit_1 = require("express-rate-limit");
const rate_limit_redis_1 = __importDefault(require("rate-limit-redis"));
const ioredis_1 = __importDefault(require("ioredis"));
const securityLogger_js_1 = require("../observability/securityLogger.js");
const redisUrl = process.env.REDIS_URL;
let redisClient;
if (redisUrl) {
    redisClient = new ioredis_1.default(redisUrl, { enableReadyCheck: false });
    redisClient.on('error', (error) => {
        securityLogger_js_1.securityLogger.logEvent('rate_limit_redis_error', {
            message: error.message,
        });
    });
}
const createRateLimiter = () => {
    const limiter = (0, express_rate_limit_1.rateLimit)({
        windowMs: 60 * 1000,
        max: 100,
        standardHeaders: 'draft-7',
        legacyHeaders: false,
        keyGenerator: (req) => (req.ip || req.headers['x-forwarded-for']?.toString() || 'unknown').toString(),
        handler: (req, res) => {
            securityLogger_js_1.securityLogger.logEvent('rate_limit_block', {
                ip: req.ip,
                path: req.originalUrl,
            });
            res.status(429).json({
                error: 'Too many requests. Please slow down.',
            });
        },
        store: redisClient && redisClient.status !== 'end'
            ? new rate_limit_redis_1.default({
                sendCommand: (...args) => {
                    const command = args[0];
                    if (typeof command !== 'string') {
                        throw new Error('Redis command must be a string');
                    }
                    return redisClient.call(command, ...args.slice(1));
                },
            })
            : undefined,
    });
    return limiter;
};
exports.createRateLimiter = createRateLimiter;
