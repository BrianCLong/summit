"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.httpCacheMiddleware = void 0;
const etag_1 = __importDefault(require("etag"));
const index_js_1 = __importDefault(require("../config/index.js"));
/**
 * Middleware to handle ETag generation and 304 Not Modified responses for GET requests.
 * Express has built-in 'etag' support, but this gives explicit control and can be extended.
 */
const httpCacheMiddleware = (req, res, next) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
        // For non-GET, we might want to disable caching explicitly
        res.setHeader('Cache-Control', 'no-store');
        res.setHeader('Pragma', 'no-cache');
        return next();
    }
    const staleWhileRevalidate = index_js_1.default.cache.staleWhileRevalidateSeconds;
    const browserTtl = Math.max(index_js_1.default.cdn.browserTtlSeconds, 0);
    const edgeTtl = Math.max(index_js_1.default.cdn.edgeTtlSeconds, browserTtl);
    res.setHeader('Cache-Control', `public, max-age=${browserTtl}, stale-while-revalidate=${staleWhileRevalidate}`);
    if (index_js_1.default.cdn.enabled) {
        const surrogateKey = `${index_js_1.default.cdn.surrogateKeyNamespace} ${req.baseUrl || req.path}`.trim();
        res.setHeader('CDN-Cache-Control', `max-age=${edgeTtl}, stale-while-revalidate=${staleWhileRevalidate}`);
        res.setHeader('Surrogate-Control', `max-age=${edgeTtl}, stale-while-revalidate=${staleWhileRevalidate}`);
        res.setHeader('Surrogate-Key', surrogateKey);
    }
    // Intercept response to generate ETag
    const originalSend = res.send;
    res.send = function (body) {
        // If headers already sent, do nothing
        if (res.headersSent) {
            return originalSend.call(this, body);
        }
        // Generate ETag if not present
        if (!res.getHeader('ETag') && body) {
            const entity = typeof body === 'string' || Buffer.isBuffer(body)
                ? body
                : JSON.stringify(body);
            const generatedEtag = (0, etag_1.default)(entity);
            res.setHeader('ETag', generatedEtag);
        }
        // Check If-None-Match
        const clientEtag = req.headers['if-none-match'];
        if (clientEtag && clientEtag === res.getHeader('ETag')) {
            res.status(304).end();
            return this;
        }
        return originalSend.call(this, body);
    };
    next();
};
exports.httpCacheMiddleware = httpCacheMiddleware;
