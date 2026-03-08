"use strict";
/**
 * API Key Manager
 *
 * Manages API keys for service authentication
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.APIKeyManager = void 0;
const crypto_1 = require("crypto");
const logger_js_1 = require("../utils/logger.js");
const logger = (0, logger_js_1.createLogger)('apikey-manager');
class APIKeyManager {
    keys = new Map();
    keysByUserId = new Map();
    createAPIKey(request) {
        const keyId = this.generateKeyId();
        const key = this.generateKey();
        const keyHash = this.hashKey(key);
        const prefix = key.substring(0, 8);
        const apiKey = {
            id: keyId,
            name: request.name,
            keyHash,
            prefix,
            userId: request.userId,
            scopes: request.scopes,
            rateLimit: request.rateLimit,
            expiresAt: request.expiresIn ? Date.now() + request.expiresIn : undefined,
            createdAt: Date.now(),
            metadata: request.metadata,
        };
        this.keys.set(keyId, apiKey);
        // Index by user ID
        if (!this.keysByUserId.has(request.userId)) {
            this.keysByUserId.set(request.userId, new Set());
        }
        this.keysByUserId.get(request.userId).add(keyId);
        logger.info('API key created', { keyId, userId: request.userId, name: request.name });
        return { apiKey, key };
    }
    validateAPIKey(key) {
        const keyHash = this.hashKey(key);
        for (const apiKey of this.keys.values()) {
            if (apiKey.keyHash === keyHash) {
                // Check if expired
                if (apiKey.expiresAt && Date.now() > apiKey.expiresAt) {
                    logger.warn('API key expired', { keyId: apiKey.id });
                    return null;
                }
                // Update last used timestamp
                apiKey.lastUsedAt = Date.now();
                logger.debug('API key validated', { keyId: apiKey.id });
                return apiKey;
            }
        }
        logger.warn('Invalid API key');
        return null;
    }
    revokeAPIKey(keyId) {
        const apiKey = this.keys.get(keyId);
        if (!apiKey) {
            return false;
        }
        this.keys.delete(keyId);
        // Remove from user index
        const userKeys = this.keysByUserId.get(apiKey.userId);
        if (userKeys) {
            userKeys.delete(keyId);
            if (userKeys.size === 0) {
                this.keysByUserId.delete(apiKey.userId);
            }
        }
        logger.info('API key revoked', { keyId, userId: apiKey.userId });
        return true;
    }
    getAPIKey(keyId) {
        return this.keys.get(keyId) || null;
    }
    listAPIKeysByUser(userId) {
        const keyIds = this.keysByUserId.get(userId);
        if (!keyIds) {
            return [];
        }
        return Array.from(keyIds)
            .map(id => this.keys.get(id))
            .filter((key) => key !== undefined);
    }
    rotateAPIKey(keyId) {
        const oldKey = this.keys.get(keyId);
        if (!oldKey) {
            return null;
        }
        // Create new key with same settings
        const newKeyData = this.createAPIKey({
            name: oldKey.name,
            userId: oldKey.userId,
            scopes: oldKey.scopes,
            rateLimit: oldKey.rateLimit,
            metadata: oldKey.metadata,
        });
        // Revoke old key
        this.revokeAPIKey(keyId);
        logger.info('API key rotated', { oldKeyId: keyId, newKeyId: newKeyData.apiKey.id });
        return newKeyData;
    }
    generateKeyId() {
        return `key_${(0, crypto_1.randomBytes)(16).toString('hex')}`;
    }
    generateKey() {
        return `sk_${(0, crypto_1.randomBytes)(32).toString('base64url')}`;
    }
    hashKey(key) {
        return (0, crypto_1.createHash)('sha256').update(key).digest('hex');
    }
    getStats() {
        return {
            totalKeys: this.keys.size,
            totalUsers: this.keysByUserId.size,
            activeKeys: Array.from(this.keys.values()).filter(k => !k.expiresAt || k.expiresAt > Date.now()).length,
        };
    }
}
exports.APIKeyManager = APIKeyManager;
