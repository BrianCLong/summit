"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authMiddleware = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const authMiddleware = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                error: 'Authorization header missing or invalid',
            });
        }
        const token = authHeader.substring(7);
        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
            console.error('JWT_SECRET environment variable not set');
            return res.status(500).json({
                error: 'Server configuration error',
            });
        }
        const decoded = jsonwebtoken_1.default.verify(token, jwtSecret);
        req.user = {
            id: decoded.userId,
            email: decoded.email,
            role: decoded.role,
            tenantId: decoded.tenantId,
        };
        next();
    }
    catch (error) {
        if (error instanceof jsonwebtoken_1.default.JsonWebTokenError) {
            return res.status(401).json({
                error: 'Invalid token',
            });
        }
        if (error instanceof jsonwebtoken_1.default.TokenExpiredError) {
            return res.status(401).json({
                error: 'Token expired',
            });
        }
        console.error('Auth middleware error:', error);
        return res.status(500).json({
            error: 'Authentication failed',
        });
    }
};
exports.authMiddleware = authMiddleware;
