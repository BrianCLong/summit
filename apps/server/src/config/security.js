"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.extraSecurityHeaders = exports.securityHeaders = void 0;
const helmet_1 = __importDefault(require("helmet"));
const securityHeaders = () => {
    const helmetConfig = {
        contentSecurityPolicy: {
            useDefaults: true,
            directives: {
                defaultSrc: ["'self'"],
                scriptSrc: ["'self'"],
                styleSrc: ["'self'", 'https:', "'unsafe-inline'"],
                imgSrc: ["'self'", 'data:', 'https:'],
                connectSrc: ["'self'"],
                frameAncestors: ["'none'"],
                objectSrc: ["'none'"],
                baseUri: ["'self'"],
                formAction: ["'self'"],
            },
        },
        crossOriginEmbedderPolicy: false,
        referrerPolicy: { policy: 'no-referrer' },
    };
    return (0, helmet_1.default)(helmetConfig);
};
exports.securityHeaders = securityHeaders;
const extraSecurityHeaders = (_req, res, next) => {
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    next();
};
exports.extraSecurityHeaders = extraSecurityHeaders;
