"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cookieParserMiddleware = void 0;
exports.buildContentSecurityPolicy = buildContentSecurityPolicy;
exports.createCsrfLayer = createCsrfLayer;
exports.createUserIpRateLimiter = createUserIpRateLimiter;
exports.shouldBypassCsrf = shouldBypassCsrf;
// @ts-nocheck
const helmet_1 = __importDefault(require("helmet"));
const csurf_1 = __importDefault(require("csurf"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const config_js_1 = require("../config.js");
const redisRateLimiter_js_1 = require("../middleware/redisRateLimiter.js");
exports.cookieParserMiddleware = (0, cookie_parser_1.default)();
function buildContentSecurityPolicy(origins) {
    const connectSources = Array.from(new Set([
        "'self'",
        ...(origins || config_js_1.cfg.CORS_ORIGIN)
            .split(',')
            .map((origin) => origin.trim())
            .filter(Boolean),
    ]));
    return (0, helmet_1.default)({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                scriptSrc: ["'self'"],
                styleSrc: ["'self'", "'unsafe-inline'"],
                imgSrc: ["'self'", 'data:', 'https:'],
                connectSrc: connectSources,
                fontSrc: ["'self'", 'https:'],
                objectSrc: ["'none'"],
                frameSrc: ["'none'"],
                baseUri: ["'self'"],
            },
        },
        referrerPolicy: { policy: 'no-referrer' },
        crossOriginEmbedderPolicy: false,
        crossOriginOpenerPolicy: { policy: 'same-origin' },
        crossOriginResourcePolicy: { policy: 'same-site' },
        frameguard: { action: 'deny' },
        hsts: {
            maxAge: 31536000,
            includeSubDomains: true,
            preload: true,
        },
    });
}
function createCsrfLayer(skip) {
    const csrfProtection = (0, csurf_1.default)({
        cookie: {
            httpOnly: true,
            sameSite: 'strict',
            secure: config_js_1.cfg.NODE_ENV === 'production',
            maxAge: 60 * 60 * 1000,
        },
        ignoreMethods: ['GET', 'HEAD', 'OPTIONS'],
        value: (req) => req.headers['x-csrf-token'] ||
            (req.body && req.body._csrf) ||
            (req.query && req.query._csrf) ||
            '',
    });
    const middleware = (req, res, next) => {
        if (skip?.(req))
            return next();
        if (!req.headers.cookie)
            return next();
        return csrfProtection(req, res, next);
    };
    const tokenRoute = (req, res) => {
        csrfProtection(req, res, () => {
            const reqWithToken = req;
            res.status(200).json({ csrfToken: reqWithToken.csrfToken?.() });
        });
    };
    return { middleware, tokenRoute };
}
function createUserIpRateLimiter() {
    return (0, redisRateLimiter_js_1.createRedisRateLimiter)({
        windowMs: config_js_1.cfg.RATE_LIMIT_WINDOW_MS,
        max: (req) => {
            const reqWithUser = req;
            const user = reqWithUser.user;
            return user ? config_js_1.cfg.RATE_LIMIT_MAX_AUTHENTICATED : config_js_1.cfg.RATE_LIMIT_MAX_REQUESTS;
        },
        keyGenerator: (req) => {
            const reqWithUser = req;
            const user = reqWithUser.user;
            if (user?.id)
                return `user:${user.id}`;
            if (user?.sub)
                return `user:${user.sub}`;
            return `ip:${req.ip}`;
        },
        message: {
            error: 'Too many requests, please slow down',
        },
    });
}
function shouldBypassCsrf(req) {
    return (req.headers.authorization !== undefined ||
        req.path.startsWith('/metrics') ||
        req.path.startsWith('/monitoring') ||
        req.path.startsWith('/health') ||
        req.path.startsWith('/healthz') ||
        req.path.startsWith('/api/webhooks') ||
        req.path.startsWith('/webhooks'));
}
