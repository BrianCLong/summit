"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rateLimitAudit = rateLimitAudit;
const redis_js_1 = require("../db/redis.js");
function rateLimitAudit(limitPer10s = 60) {
    return async (req, res, next) => {
        try {
            await redis_js_1.redisConnection.connect?.();
            const token = String(req.get('x-audit-token') || 'anon');
            const path = String(req.path || '').replace(/\W+/g, '_');
            const bucket = Math.floor(Date.now() / 1000 / 10);
            const key = `audit:rl:${token}:${path}:${bucket}`;
            const n = (await redis_js_1.redisConnection.client?.incr(key)) || 1;
            if (n === 1) {
                await redis_js_1.redisConnection.client?.expire(key, 15);
            }
            const limit = limitPer10s;
            if (n > limit)
                return res.status(429).send('rate_limited');
        }
        catch { }
        next();
    };
}
