"use strict";
/**
 * Idempotency Middleware
 *
 * Ensures idempotent request handling
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.idempotencyMiddleware = idempotencyMiddleware;
/**
 * In-memory idempotency storage (for demo, use Redis in production)
 */
class MemoryIdempotencyStorage {
    store = new Map();
    async get(key) {
        const entry = this.store.get(key);
        if (!entry) {
            return null;
        }
        if (entry.expiresAt < Date.now()) {
            this.store.delete(key);
            return null;
        }
        return entry.record;
    }
    async set(key, record, ttl) {
        const expiresAt = Date.now() + ttl * 1000;
        this.store.set(key, { record, expiresAt });
    }
    async delete(key) {
        this.store.delete(key);
    }
    // Cleanup expired entries
    cleanup() {
        const now = Date.now();
        for (const [key, entry] of this.store.entries()) {
            if (entry.expiresAt < now) {
                this.store.delete(key);
            }
        }
    }
}
function idempotencyMiddleware(options) {
    const storage = options.storage || new MemoryIdempotencyStorage();
    const headerName = options.header || 'idempotency-key';
    const ttl = options.ttl || 86400; // 24 hours default
    // Cleanup expired entries every hour
    if (storage instanceof MemoryIdempotencyStorage) {
        setInterval(() => storage.cleanup(), 3600000);
    }
    return async (req, res, next) => {
        // Only apply to mutating operations
        if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
            return next();
        }
        const idempotencyKey = req.get(headerName);
        if (!idempotencyKey) {
            return next();
        }
        // Store key in context
        if (req.context) {
            req.context.idempotencyKey = idempotencyKey;
        }
        try {
            // Check if we've seen this request before
            const existing = await storage.get(idempotencyKey);
            if (existing) {
                // Return cached response
                res.set(existing.headers);
                return res.status(existing.status).json(existing.body);
            }
            // Intercept response
            const originalJson = res.json.bind(res);
            const originalStatus = res.status.bind(res);
            let statusCode = 200;
            let responseBody;
            res.status = function (code) {
                statusCode = code;
                return originalStatus(code);
            };
            res.json = function (body) {
                responseBody = body;
                // Store in cache
                const record = {
                    key: idempotencyKey,
                    status: statusCode,
                    headers: res.getHeaders(),
                    body: responseBody,
                    createdAt: new Date(),
                };
                storage.set(idempotencyKey, record, ttl).catch((err) => {
                    console.error('Failed to store idempotency record:', err);
                });
                return originalJson(body);
            };
            next();
        }
        catch (error) {
            next(error);
        }
    };
}
