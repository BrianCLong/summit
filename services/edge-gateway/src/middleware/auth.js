"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authMiddleware = authMiddleware;
exports.generateToken = generateToken;
exports.requireRole = requireRole;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
/**
 * Authentication middleware
 */
function authMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).json({
            error: 'Unauthorized',
            message: 'No authorization header provided'
        });
    }
    const [scheme, token] = authHeader.split(' ');
    if (scheme !== 'Bearer' || !token) {
        return res.status(401).json({
            error: 'Unauthorized',
            message: 'Invalid authorization header format'
        });
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    }
    catch (error) {
        return res.status(401).json({
            error: 'Unauthorized',
            message: 'Invalid or expired token'
        });
    }
}
/**
 * Generate JWT token
 */
function generateToken(payload) {
    return jsonwebtoken_1.default.sign(payload, JWT_SECRET, { expiresIn: '24h' });
}
/**
 * Role-based access control middleware
 */
function requireRole(...roles) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                error: 'Unauthorized',
                message: 'Authentication required'
            });
        }
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                error: 'Forbidden',
                message: 'Insufficient permissions'
            });
        }
        next();
    };
}
