"use strict";
// @ts-nocheck
/**
 * JWT Token Manager
 *
 * Handles JWT token generation, validation, and lifecycle management
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.JWTManager = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const logger_js_1 = require("../utils/logger.js");
const logger = (0, logger_js_1.createLogger)('jwt-manager');
class JWTManager {
    config;
    constructor(config) {
        this.config = {
            algorithm: 'HS256',
            expiresIn: '15m',
            refreshExpiresIn: '7d',
            ...config,
        };
    }
    generateTokenPair(payload) {
        const accessToken = this.generateAccessToken(payload);
        const refreshToken = this.generateRefreshToken(payload);
        const decoded = jsonwebtoken_1.default.decode(accessToken);
        const expiresIn = decoded.exp - Math.floor(Date.now() / 1000);
        logger.info('Token pair generated', { sub: payload.sub });
        return {
            accessToken,
            refreshToken,
            expiresIn,
        };
    }
    generateAccessToken(payload) {
        const signOptions = {
            algorithm: this.config.algorithm,
            expiresIn: this.config.expiresIn,
        };
        if (this.config.issuer) {
            signOptions.issuer = this.config.issuer;
        }
        if (this.config.audience) {
            signOptions.audience = this.config.audience;
        }
        const secret = this.config.privateKey || this.config.secret;
        return jsonwebtoken_1.default.sign(payload, secret, signOptions);
    }
    generateRefreshToken(payload) {
        const refreshPayload = {
            sub: payload.sub,
            type: 'refresh',
        };
        return jsonwebtoken_1.default.sign(refreshPayload, this.config.secret, {
            expiresIn: this.config.refreshExpiresIn,
        });
    }
    verifyAccessToken(token) {
        try {
            const secret = this.config.publicKey || this.config.secret;
            const decoded = jsonwebtoken_1.default.verify(token, secret, {
                algorithms: [this.config.algorithm],
                issuer: this.config.issuer,
                audience: this.config.audience,
            });
            return decoded;
        }
        catch (error) {
            logger.error('Token verification failed', {
                error: error instanceof Error ? error.message : String(error),
            });
            throw new Error('Invalid token');
        }
    }
    verifyRefreshToken(token) {
        try {
            const decoded = jsonwebtoken_1.default.verify(token, this.config.secret);
            if (decoded.type !== 'refresh') {
                throw new Error('Invalid refresh token');
            }
            return { sub: decoded.sub };
        }
        catch (error) {
            logger.error('Refresh token verification failed', {
                error: error instanceof Error ? error.message : String(error),
            });
            throw new Error('Invalid refresh token');
        }
    }
    refreshAccessToken(refreshToken, payload) {
        // Verify refresh token
        this.verifyRefreshToken(refreshToken);
        // Generate new token pair
        return this.generateTokenPair(payload);
    }
    decodeToken(token) {
        try {
            return jsonwebtoken_1.default.decode(token);
        }
        catch {
            return null;
        }
    }
    isTokenExpired(token) {
        const decoded = this.decodeToken(token);
        if (!decoded || typeof decoded !== 'object' || !('exp' in decoded)) {
            return true;
        }
        const exp = decoded.exp;
        if (!exp) {
            return true;
        }
        return Date.now() >= exp * 1000;
    }
}
exports.JWTManager = JWTManager;
