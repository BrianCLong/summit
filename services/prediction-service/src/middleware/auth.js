"use strict";
/**
 * Authentication Middleware
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.apiKeyAuth = apiKeyAuth;
exports.rateLimiter = rateLimiter;
exports.requestLogger = requestLogger;
const defaultConfig = {
    apiKeys: new Set(process.env.API_KEYS?.split(',') || ['dev-api-key']),
    jwtSecret: process.env.JWT_SECRET,
    enabled: process.env.AUTH_ENABLED !== 'false',
};
/**
 * API Key authentication middleware
 */
function apiKeyAuth(config = defaultConfig) {
    return (req, res, next) => {
        if (!config.enabled) {
            next();
            return;
        }
        const apiKey = req.headers['x-api-key'] || req.query.api_key;
        if (!apiKey) {
            res.status(401).json({
                error: 'Unauthorized',
                message: 'API key required. Provide X-API-Key header or api_key query parameter.',
            });
            return;
        }
        if (!config.apiKeys.has(apiKey)) {
            res.status(403).json({
                error: 'Forbidden',
                message: 'Invalid API key.',
            });
            return;
        }
        next();
    };
}
/**
 * Rate limiting middleware
 */
function rateLimiter(options = { windowMs: 60000, maxRequests: 100 }) {
    const requests = new Map();
    return (req, res, next) => {
        const clientId = req.ip || req.headers['x-forwarded-for'] || 'unknown';
        const now = Date.now();
        let clientData = requests.get(clientId);
        if (!clientData || now > clientData.resetTime) {
            clientData = { count: 0, resetTime: now + options.windowMs };
            requests.set(clientId, clientData);
        }
        clientData.count++;
        res.setHeader('X-RateLimit-Limit', options.maxRequests);
        res.setHeader('X-RateLimit-Remaining', Math.max(0, options.maxRequests - clientData.count));
        res.setHeader('X-RateLimit-Reset', clientData.resetTime);
        if (clientData.count > options.maxRequests) {
            res.status(429).json({
                error: 'Too Many Requests',
                message: `Rate limit exceeded. Try again after ${new Date(clientData.resetTime).toISOString()}`,
                retryAfter: Math.ceil((clientData.resetTime - now) / 1000),
            });
            return;
        }
        next();
    };
}
/**
 * Request logging middleware
 */
function requestLogger() {
    return (req, res, next) => {
        const startTime = Date.now();
        res.on('finish', () => {
            const duration = Date.now() - startTime;
            console.log(JSON.stringify({
                timestamp: new Date().toISOString(),
                method: req.method,
                path: req.path,
                statusCode: res.statusCode,
                duration,
                userAgent: req.headers['user-agent'],
                ip: req.ip,
            }));
        });
        next();
    };
}
