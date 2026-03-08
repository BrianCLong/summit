"use strict";
// @ts-nocheck
// server/src/conductor/auth/jwt-rotation.ts
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.jwtRotationManager = exports.JWTRotationManager = void 0;
const crypto_1 = require("crypto");
const util_1 = require("util");
const ioredis_1 = __importDefault(require("ioredis"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const logger_js_1 = __importDefault(require("../../config/logger.js"));
class JWTRotationManager {
    redisUrl;
    keyRotationIntervalMs;
    keyValidityMs;
    maxKeys;
    redis;
    rotationInterval = null;
    keys = new Map();
    activeKeyId = null;
    constructor(redisUrl = process.env.REDIS_URL ||
        'redis://localhost:6379', keyRotationIntervalMs = 24 * 60 * 60 * 1000, // 24 hours
    keyValidityMs = 7 * 24 * 60 * 60 * 1000, // 7 days
    maxKeys = 5) {
        this.redisUrl = redisUrl;
        this.keyRotationIntervalMs = keyRotationIntervalMs;
        this.keyValidityMs = keyValidityMs;
        this.maxKeys = maxKeys;
        this.redis = new ioredis_1.default(redisUrl, {
            retryDelayOnFailover: 100,
            maxRetriesPerRequest: 3,
            lazyConnect: true,
        });
    }
    /**
     * Initialize JWT rotation system
     */
    async initialize() {
        try {
            await this.redis.connect();
            await this.loadKeysFromStorage();
            if (this.keys.size === 0) {
                logger_js_1.default.info('🔑 No existing JWT keys found, generating initial key pair');
                await this.generateNewKeyPair();
            }
            await this.cleanupExpiredKeys();
            this.startRotationSchedule();
            logger_js_1.default.info('🔐 JWT rotation manager initialized', {
                activeKeys: this.keys.size,
                activeKeyId: this.activeKeyId,
                rotationInterval: `${this.keyRotationIntervalMs / (60 * 1000)} minutes`,
            });
        }
        catch (error) {
            logger_js_1.default.error('❌ Failed to initialize JWT rotation manager', {
                error: error.message,
            });
            throw error;
        }
    }
    /**
     * Generate new JWT key pair with rotation
     */
    async generateNewKeyPair() {
        const keyId = this.generateKeyId();
        const keyPair = await this.generateRSAKeyPair();
        const jwtKeyPair = {
            keyId,
            publicKey: keyPair.publicKey,
            privateKey: keyPair.privateKey,
            algorithm: 'RS256',
            createdAt: new Date(),
            expiresAt: new Date(Date.now() + this.keyValidityMs),
            isActive: true,
        };
        // Deactivate previous active key but keep it valid for token verification
        if (this.activeKeyId) {
            const prevKey = this.keys.get(this.activeKeyId);
            if (prevKey) {
                prevKey.isActive = false;
                await this.saveKeyToStorage(prevKey);
            }
        }
        this.keys.set(keyId, jwtKeyPair);
        this.activeKeyId = keyId;
        await this.saveKeyToStorage(jwtKeyPair);
        await this.redis.set('jwt:active_key_id', keyId, 'EX', this.keyValidityMs / 1000);
        logger_js_1.default.info('🔑 Generated new JWT key pair', {
            keyId,
            algorithm: jwtKeyPair.algorithm,
            expiresAt: jwtKeyPair.expiresAt.toISOString(),
        });
        return jwtKeyPair;
    }
    /**
     * Sign JWT token with active key
     */
    async signToken(payload, options = {}) {
        if (!this.activeKeyId) {
            throw new Error('No active JWT key available for signing');
        }
        const activeKey = this.keys.get(this.activeKeyId);
        if (!activeKey) {
            throw new Error(`Active key ${this.activeKeyId} not found in key store`);
        }
        const signOptions = {
            algorithm: activeKey.algorithm,
            keyid: activeKey.keyId,
            issuer: process.env.JWT_ISSUER || 'maestro-conductor',
            audience: process.env.JWT_AUDIENCE || 'intelgraph-platform',
            expiresIn: '1h',
            ...options,
        };
        try {
            const token = jsonwebtoken_1.default.sign(payload, activeKey.privateKey, signOptions);
            logger_js_1.default.debug('🎫 JWT token signed', {
                keyId: activeKey.keyId,
                algorithm: activeKey.algorithm,
                expiresIn: signOptions.expiresIn,
            });
            return token;
        }
        catch (error) {
            logger_js_1.default.error('❌ Failed to sign JWT token', {
                error: error.message,
                keyId: activeKey.keyId,
            });
            throw error;
        }
    }
    /**
     * Verify JWT token with any valid key
     */
    async verifyToken(token) {
        const decoded = jsonwebtoken_1.default.decode(token, { complete: true });
        if (!decoded || typeof decoded === 'string') {
            throw new Error('Invalid token format');
        }
        const keyId = decoded.header.kid;
        if (!keyId) {
            throw new Error('Token missing key ID (kid) in header');
        }
        const key = this.keys.get(keyId);
        if (!key) {
            // Try to load key from storage in case it's not in memory
            await this.loadKeyFromStorage(keyId);
            const refreshedKey = this.keys.get(keyId);
            if (!refreshedKey) {
                throw new Error(`JWT key ${keyId} not found or expired`);
            }
        }
        const verifyKey = this.keys.get(keyId);
        try {
            const verifyOptions = {
                algorithms: [verifyKey.algorithm],
                issuer: process.env.JWT_ISSUER || 'maestro-conductor',
                audience: process.env.JWT_AUDIENCE || 'intelgraph-platform',
            };
            const payload = jsonwebtoken_1.default.verify(token, verifyKey.publicKey, verifyOptions);
            logger_js_1.default.debug('✅ JWT token verified', {
                keyId: verifyKey.keyId,
                algorithm: verifyKey.algorithm,
            });
            return payload;
        }
        catch (error) {
            logger_js_1.default.error('❌ Failed to verify JWT token', {
                error: error.message,
                keyId: verifyKey.keyId,
            });
            throw error;
        }
    }
    /**
     * Get JWKS (JSON Web Key Set) for public key distribution
     */
    async getJWKS() {
        const validKeys = Array.from(this.keys.values())
            .filter((key) => key.expiresAt > new Date())
            .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        const jwks = {
            keys: validKeys.map((key) => ({
                kty: 'RSA',
                use: 'sig',
                kid: key.keyId,
                alg: key.algorithm,
                // In production, you'd extract n and e from the RSA public key
                // For now, we'll use the full certificate approach
                x5c: [Buffer.from(key.publicKey).toString('base64')],
            })),
        };
        return jwks;
    }
    /**
     * Force immediate key rotation
     */
    async rotateKeys() {
        logger_js_1.default.info('🔄 Forcing JWT key rotation');
        await this.generateNewKeyPair();
        await this.cleanupExpiredKeys();
        logger_js_1.default.info('✅ JWT key rotation completed', {
            activeKeyId: this.activeKeyId,
            totalKeys: this.keys.size,
        });
    }
    /**
     * Get rotation status and metrics
     */
    getRotationStatus() {
        const nextRotation = this.rotationInterval
            ? new Date(Date.now() + this.keyRotationIntervalMs)
            : null;
        return {
            activeKeyId: this.activeKeyId,
            totalKeys: this.keys.size,
            nextRotation,
            keysMetrics: Array.from(this.keys.values()).map((key) => ({
                keyId: key.keyId,
                createdAt: key.createdAt,
                expiresAt: key.expiresAt,
                isActive: key.isActive,
                algorithm: key.algorithm,
            })),
        };
    }
    /**
     * Cleanup and shutdown
     */
    async shutdown() {
        if (this.rotationInterval) {
            clearInterval(this.rotationInterval);
            this.rotationInterval = null;
        }
        await this.redis.quit();
        logger_js_1.default.info('🔐 JWT rotation manager shutdown completed');
    }
    // Private methods
    generateKeyId() {
        const timestamp = Date.now().toString(36);
        const random = (0, crypto_1.randomBytes)(8).toString('hex');
        return `jwt_key_${timestamp}_${random}`;
    }
    async generateRSAKeyPair() {
        const { generateKeyPair } = await Promise.resolve().then(() => __importStar(require('crypto')));
        const generateKeyPairAsync = (0, util_1.promisify)(generateKeyPair);
        const { publicKey, privateKey } = await generateKeyPairAsync('rsa', {
            modulusLength: 2048,
            publicKeyEncoding: {
                type: 'spki',
                format: 'pem',
            },
            privateKeyEncoding: {
                type: 'pkcs8',
                format: 'pem',
            },
        });
        return { publicKey, privateKey };
    }
    startRotationSchedule() {
        this.rotationInterval = setInterval(async () => {
            try {
                await this.generateNewKeyPair();
                await this.cleanupExpiredKeys();
            }
            catch (error) {
                logger_js_1.default.error('❌ Scheduled JWT key rotation failed', {
                    error: error.message,
                });
            }
        }, this.keyRotationIntervalMs);
    }
    async loadKeysFromStorage() {
        try {
            const keyIds = await this.redis.smembers('jwt:key_ids');
            for (const keyId of keyIds) {
                await this.loadKeyFromStorage(keyId);
            }
            // Load active key ID
            const activeKeyId = await this.redis.get('jwt:active_key_id');
            if (activeKeyId && this.keys.has(activeKeyId)) {
                this.activeKeyId = activeKeyId;
            }
            logger_js_1.default.info('📥 Loaded JWT keys from storage', {
                keysLoaded: this.keys.size,
                activeKeyId: this.activeKeyId,
            });
        }
        catch (error) {
            logger_js_1.default.error('❌ Failed to load keys from storage', {
                error: error.message,
            });
        }
    }
    async loadKeyFromStorage(keyId) {
        try {
            const keyData = await this.redis.hgetall(`jwt:key:${keyId}`);
            if (keyData.keyId) {
                const jwtKeyPair = {
                    keyId: keyData.keyId,
                    publicKey: keyData.publicKey,
                    privateKey: keyData.privateKey,
                    algorithm: keyData.algorithm,
                    createdAt: new Date(keyData.createdAt),
                    expiresAt: new Date(keyData.expiresAt),
                    isActive: keyData.isActive === 'true',
                };
                this.keys.set(keyId, jwtKeyPair);
            }
        }
        catch (error) {
            logger_js_1.default.error('❌ Failed to load key from storage', {
                keyId,
                error: error.message,
            });
        }
    }
    async saveKeyToStorage(key) {
        try {
            const keyData = {
                keyId: key.keyId,
                publicKey: key.publicKey,
                privateKey: key.privateKey,
                algorithm: key.algorithm,
                createdAt: key.createdAt.toISOString(),
                expiresAt: key.expiresAt.toISOString(),
                isActive: key.isActive.toString(),
            };
            await Promise.all([
                this.redis.hmset(`jwt:key:${key.keyId}`, keyData),
                this.redis.sadd('jwt:key_ids', key.keyId),
                this.redis.expireat(`jwt:key:${key.keyId}`, Math.floor(key.expiresAt.getTime() / 1000)),
            ]);
        }
        catch (error) {
            logger_js_1.default.error('❌ Failed to save key to storage', {
                keyId: key.keyId,
                error: error.message,
            });
            throw error;
        }
    }
    async cleanupExpiredKeys() {
        const now = new Date();
        const expiredKeys = [];
        for (const [keyId, key] of this.keys.entries()) {
            if (key.expiresAt <= now) {
                expiredKeys.push(keyId);
            }
        }
        // Keep at least one key even if expired (emergency fallback)
        if (expiredKeys.length >= this.keys.size) {
            expiredKeys.splice(-1, 1); // Keep the most recent expired key
        }
        for (const keyId of expiredKeys) {
            this.keys.delete(keyId);
            await Promise.all([
                this.redis.del(`jwt:key:${keyId}`),
                this.redis.srem('jwt:key_ids', keyId),
            ]);
        }
        // Cleanup if we have too many keys
        if (this.keys.size > this.maxKeys) {
            const sortedKeys = Array.from(this.keys.entries())
                .sort(([, a], [, b]) => b.createdAt.getTime() - a.createdAt.getTime())
                .slice(this.maxKeys);
            for (const [keyId] of sortedKeys) {
                this.keys.delete(keyId);
                await Promise.all([
                    this.redis.del(`jwt:key:${keyId}`),
                    this.redis.srem('jwt:key_ids', keyId),
                ]);
            }
        }
        if (expiredKeys.length > 0) {
            logger_js_1.default.info('🧹 Cleaned up expired JWT keys', {
                expiredKeysRemoved: expiredKeys.length,
                remainingKeys: this.keys.size,
            });
        }
    }
}
exports.JWTRotationManager = JWTRotationManager;
// Singleton instance for application use
exports.jwtRotationManager = new JWTRotationManager();
