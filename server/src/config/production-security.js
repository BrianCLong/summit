"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.applyProductionSecurity = exports.productionAuthMiddleware = void 0;
const helmet_1 = __importDefault(require("helmet"));
const logger_js_1 = require("../config/logger.js");
const AuthService_js_1 = __importDefault(require("../services/AuthService.js"));
/**
 * Production Authentication Middleware
 * Verifies JWT tokens using AuthService and attaches the user to the request.
 * Designed to be used in the `authenticateToken` chain in app.ts.
 */
const productionAuthMiddleware = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) {
        // 401 Unauthorized: No credentials provided
        return res.status(401).json({ error: 'Unauthorized: No token provided' });
    }
    try {
        const authService = new AuthService_js_1.default();
        const user = await authService.verifyToken(token);
        if (!user) {
            // 403 Forbidden: Credentials invalid or blacklisted
            return res.status(403).json({ error: 'Forbidden: Invalid token' });
        }
        // Attach user to request
        req.user = user;
        next();
    }
    catch (error) {
        logger_js_1.logger.error('Authentication error:', error);
        return res.status(403).json({ error: 'Forbidden: Token verification failed' });
    }
};
exports.productionAuthMiddleware = productionAuthMiddleware;
/**
 * Apply Production Security Configurations
 * This function is called during app initialization in production mode.
 * It supplements the standard security middleware (Helmet, CORS) defined in app.ts.
 */
const applyProductionSecurity = (app) => {
    logger_js_1.logger.info('Applying additional production security configurations...');
    // 1. Strict Transport Security (HSTS)
    // Already handled by securityHeaders in app.ts, but we reinforce it here just in case,
    // or add other headers Helmet doesn't default to.
    // Note: helmet() in app.ts enables HSTS in production.
    // 2. Permissions Policy (formerly Feature Policy)
    // Restrict browser features to improve privacy and security.
    app.use((req, res, next) => {
        res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=(), payment=(), usb=(), vr=()');
        next();
    });
    // 3. X-Permitted-Cross-Domain-Policies
    // Prevent Adobe Flash and PDF documents from loading data from this domain.
    app.use(helmet_1.default.permittedCrossDomainPolicies({
        permittedPolicies: 'none',
    }));
    // 4. Disable X-Powered-By (Redundant as Helmet does it, but good practice)
    app.disable('x-powered-by');
    // 5. Additional hardening can be added here (e.g., specific CSP adjustments)
};
exports.applyProductionSecurity = applyProductionSecurity;
