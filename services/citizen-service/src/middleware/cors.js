"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.corsMiddleware = corsMiddleware;
const ALLOWED_ORIGINS = process.env.CORS_ORIGINS?.split(',') || [
    'http://localhost:3000',
    'http://localhost:4000',
];
/**
 * CORS middleware for citizen service
 */
function corsMiddleware(req, res, next) {
    const origin = req.headers.origin;
    if (origin && ALLOWED_ORIGINS.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Request-ID');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Max-Age', '86400');
    if (req.method === 'OPTIONS') {
        res.status(204).end();
        return;
    }
    next();
}
