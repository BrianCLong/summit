"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authorize = exports.authenticate = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const config_1 = require("../config");
const logger_1 = require("../utils/logger");
const authenticate = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Authentication token required' });
        }
        const token = authHeader.substring(7); // Remove 'Bearer ' prefix
        try {
            const decoded = jsonwebtoken_1.default.verify(token, config_1.config.auth.jwtSecret);
            req.user = {
                id: decoded.userId || decoded.id,
                email: decoded.email,
                role: decoded.role || 'user',
            };
            next();
        }
        catch (jwtError) {
            logger_1.logger.warn('Invalid JWT token:', jwtError);
            return res.status(401).json({ error: 'Invalid authentication token' });
        }
    }
    catch (error) {
        logger_1.logger.error('Authentication error:', error);
        return res.status(500).json({ error: 'Authentication failed' });
    }
};
exports.authenticate = authenticate;
const authorize = (allowedRoles) => {
    return (req, res, next) => {
        try {
            if (!req.user) {
                return res.status(401).json({ error: 'Authentication required' });
            }
            if (!allowedRoles.includes(req.user.role)) {
                return res.status(403).json({ error: 'Insufficient permissions' });
            }
            next();
        }
        catch (error) {
            logger_1.logger.error('Authorization error:', error);
            return res.status(500).json({ error: 'Authorization failed' });
        }
    };
};
exports.authorize = authorize;
