"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.dpGate = void 0;
const mechanisms_js_1 = require("../services/dp-runtime/mechanisms.js");
const errors_js_1 = require("../lib/errors.js");
const crypto_1 = __importDefault(require("crypto"));
const budgetLedger = new mechanisms_js_1.PrivacyBudgetLedger();
const laplace = new mechanisms_js_1.LaplaceMechanism();
const cache = new ioredis_1.Redis(process.env.REDIS_URL || 'redis://localhost:6379');
const dpGate = (config) => {
    return async (req, res, next) => {
        try {
            if (!req.user) {
                return next(new errors_js_1.AppError('User context required for DP', 401));
            }
            // Generate cache key based on query params and user (or tenant if appropriate)
            // Including user.id implies personalized DP or user-level caching.
            // If the query is global, we should include query params.
            const cacheKey = `dp:cache:${crypto_1.default.createHash('sha256').update(JSON.stringify({
                path: req.path,
                query: req.query,
                body: req.body
            })).digest('hex')}`;
            // Check Cache
            const cachedResponse = await cache.get(cacheKey);
            if (cachedResponse) {
                return res.json(JSON.parse(cachedResponse));
            }
            // Check and Consume Budget Atomically
            const allowed = await budgetLedger.consumeBudgetIfAvailable(req.user.id, config.epsilon);
            if (!allowed) {
                return res.status(429).json({
                    error: 'Privacy Budget Exceeded',
                    details: 'You have exhausted your privacy budget for this window.'
                });
            }
            req.dp = {
                applied: true,
                epsilon: config.epsilon,
                mechanism: 'Laplace'
            };
            const originalJson = res.json;
            res.json = function (body) {
                if (body && typeof body === 'object') {
                    // Deep traverse or specific field check
                    // Simplified for now: check top-level keys
                    const keys = Object.keys(body);
                    let applied = false;
                    for (const key of keys) {
                        if (['count', 'sum', 'avg', 'mean', 'total'].includes(key) && typeof body[key] === 'number') {
                            // Check k-anonymity if 'count' is present or if we treat this as a small-N check
                            // For averages, we often need the count too.
                            // Assuming 'count' is available for check if configured.
                            if (config.minK && typeof body.count === 'number' && body.count < config.minK) {
                                return res.status(403).json({
                                    error: 'Small-N Protection',
                                    details: 'Result set too small to ensure privacy.'
                                });
                            }
                            body[key] = laplace.addNoise(body[key], config.sensitivity, config.epsilon);
                            applied = true;
                        }
                    }
                    if (applied) {
                        body.dpMetadata = req.dp;
                        // Cache the noisy result
                        // TTL could match budget window or shorter
                        cache.set(cacheKey, JSON.stringify(body), 'EX', 3600);
                    }
                }
                return originalJson.call(this, body);
            };
            next();
        }
        catch (err) {
            next(err);
        }
    };
};
exports.dpGate = dpGate;
