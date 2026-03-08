"use strict";
/**
 * Secret Rotation Manager
 *
 * Implements automated secret rotation for IC-grade security:
 * - JWT key rotation (already integrated with jwt-security.ts)
 * - Database credential rotation
 * - API key rotation
 * - Encryption key rotation
 * - Webhook secret rotation
 *
 * @module security/secret-rotation
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SecretRotationManager = void 0;
exports.getSecretRotationManager = getSecretRotationManager;
exports.resetSecretRotationManager = resetSecretRotationManager;
const crypto_1 = __importDefault(require("crypto"));
const ioredis_1 = __importDefault(require("ioredis"));
const events_1 = require("events");
const logger_js_1 = __importDefault(require("../config/logger.js"));
// ============================================================================
// Secret Rotation Manager
// ============================================================================
class SecretRotationManager extends events_1.EventEmitter {
    redis;
    config;
    policies;
    rotationTimer = null;
    masterKey;
    isInitialized = false;
    constructor(redisUrl, config) {
        super();
        this.config = {
            enabled: true,
            checkIntervalMs: 60 * 1000, // Check every minute
            gracePeriodMs: 24 * 60 * 60 * 1000, // 24 hour grace period
            maxVersionsRetained: 3,
            notifyBeforeExpiryMs: 7 * 24 * 60 * 60 * 1000, // 7 days before expiry
            encryptAtRest: true,
            ...config,
        };
        this.redis = new ioredis_1.default(redisUrl || process.env.REDIS_URL || 'redis://localhost:6379', {
            keyPrefix: 'secrets:',
            retryDelayOnFailover: 100,
            maxRetriesPerRequest: 3,
            lazyConnect: true,
        });
        this.policies = new Map();
        this.masterKey = this.deriveMasterKey();
        this.initializeDefaultPolicies();
    }
    /**
     * Derive master key for encryption at rest
     */
    deriveMasterKey() {
        const seed = process.env.SECRET_MASTER_KEY || process.env.JWT_SECRET || 'development-key';
        return crypto_1.default.scryptSync(seed, 'summit-secrets', 32);
    }
    /**
     * Initialize default rotation policies
     */
    initializeDefaultPolicies() {
        // JWT signing key - rotate every 7 days
        this.policies.set('jwt-signing', {
            type: 'jwt-signing',
            rotationIntervalMs: 7 * 24 * 60 * 60 * 1000,
            autoRotate: true,
        });
        // JWT refresh key - rotate every 30 days
        this.policies.set('jwt-refresh', {
            type: 'jwt-refresh',
            rotationIntervalMs: 30 * 24 * 60 * 60 * 1000,
            autoRotate: true,
        });
        // Database credentials - rotate every 90 days
        this.policies.set('database', {
            type: 'database',
            rotationIntervalMs: 90 * 24 * 60 * 60 * 1000,
            autoRotate: false, // Manual due to coordination required
        });
        // API keys - rotate every 90 days
        this.policies.set('api-key', {
            type: 'api-key',
            rotationIntervalMs: 90 * 24 * 60 * 60 * 1000,
            autoRotate: true,
        });
        // Encryption keys - rotate every 365 days
        this.policies.set('encryption', {
            type: 'encryption',
            rotationIntervalMs: 365 * 24 * 60 * 60 * 1000,
            autoRotate: false, // Manual due to re-encryption required
        });
        // Webhook secrets - rotate every 30 days
        this.policies.set('webhook', {
            type: 'webhook',
            rotationIntervalMs: 30 * 24 * 60 * 60 * 1000,
            autoRotate: true,
        });
    }
    /**
     * Initialize the secret rotation manager
     */
    async initialize() {
        if (this.isInitialized)
            return;
        try {
            await this.redis.connect();
            if (this.config.enabled) {
                this.startRotationScheduler();
            }
            this.isInitialized = true;
            logger_js_1.default.info('Secret rotation manager initialized', {
                enabled: this.config.enabled,
                checkInterval: `${this.config.checkIntervalMs / 1000}s`,
                policies: Array.from(this.policies.keys()),
            });
        }
        catch (error) {
            logger_js_1.default.error('Failed to initialize secret rotation manager', {
                error: error instanceof Error ? error.message : String(error),
            });
            throw error;
        }
    }
    /**
     * Start the rotation scheduler
     */
    startRotationScheduler() {
        if (this.rotationTimer) {
            clearInterval(this.rotationTimer);
        }
        this.rotationTimer = setInterval(async () => {
            try {
                await this.checkAndRotateSecrets();
            }
            catch (error) {
                logger_js_1.default.error('Secret rotation check failed', {
                    error: error instanceof Error ? error.message : String(error),
                });
            }
        }, this.config.checkIntervalMs);
        logger_js_1.default.info('Secret rotation scheduler started');
    }
    /**
     * Check and rotate secrets that need rotation
     */
    async checkAndRotateSecrets() {
        const secretKeys = await this.redis.keys('*:metadata');
        for (const key of secretKeys) {
            try {
                const metadataStr = await this.redis.get(key);
                if (!metadataStr)
                    continue;
                const metadata = JSON.parse(metadataStr);
                const policy = this.policies.get(metadata.type);
                if (!policy || !policy.autoRotate)
                    continue;
                // Check if rotation is needed
                const now = Date.now();
                const expiresAt = new Date(metadata.expiresAt).getTime();
                const shouldRotate = now >= expiresAt - this.config.gracePeriodMs;
                // Check if notification is needed
                const shouldNotify = now >= expiresAt - this.config.notifyBeforeExpiryMs;
                if (shouldNotify && metadata.status === 'active') {
                    this.emit('secret:expiring-soon', {
                        secretId: metadata.id,
                        type: metadata.type,
                        expiresAt: metadata.expiresAt,
                        daysUntilExpiry: Math.ceil((expiresAt - now) / (24 * 60 * 60 * 1000)),
                    });
                }
                if (shouldRotate && metadata.status === 'active') {
                    await this.rotateSecret(metadata.id, 'scheduled');
                }
            }
            catch (error) {
                logger_js_1.default.error('Error checking secret for rotation', {
                    key,
                    error: error instanceof Error ? error.message : String(error),
                });
            }
        }
    }
    /**
     * Register a new secret
     */
    async registerSecret(type, name, value, tags = []) {
        const id = crypto_1.default.randomUUID();
        const policy = this.policies.get(type);
        const now = new Date();
        const metadata = {
            id,
            type,
            name,
            version: 1,
            createdAt: now,
            expiresAt: new Date(now.getTime() + (policy?.rotationIntervalMs || 90 * 24 * 60 * 60 * 1000)),
            status: 'active',
            environment: process.env.NODE_ENV || 'development',
            tags,
        };
        // Store encrypted secret value
        const encryptedValue = this.config.encryptAtRest
            ? this.encrypt(value)
            : value;
        await Promise.all([
            this.redis.set(`${id}:metadata`, JSON.stringify(metadata)),
            this.redis.set(`${id}:value:${metadata.version}`, encryptedValue),
            this.redis.sadd('secret:ids', id),
            this.redis.sadd(`secret:type:${type}`, id),
        ]);
        logger_js_1.default.info('Secret registered', {
            id,
            type,
            name,
            expiresAt: metadata.expiresAt.toISOString(),
        });
        this.emit('secret:registered', metadata);
        return metadata;
    }
    /**
     * Get secret value
     */
    async getSecret(id, version) {
        const metadataStr = await this.redis.get(`${id}:metadata`);
        if (!metadataStr)
            return null;
        const metadata = JSON.parse(metadataStr);
        const targetVersion = version || metadata.version;
        const encryptedValue = await this.redis.get(`${id}:value:${targetVersion}`);
        if (!encryptedValue)
            return null;
        return this.config.encryptAtRest
            ? this.decrypt(encryptedValue)
            : encryptedValue;
    }
    /**
     * Get secret metadata
     */
    async getSecretMetadata(id) {
        const metadataStr = await this.redis.get(`${id}:metadata`);
        if (!metadataStr)
            return null;
        const metadata = JSON.parse(metadataStr);
        metadata.createdAt = new Date(metadata.createdAt);
        metadata.expiresAt = new Date(metadata.expiresAt);
        if (metadata.rotatedAt) {
            metadata.rotatedAt = new Date(metadata.rotatedAt);
        }
        return metadata;
    }
    /**
     * Rotate a secret
     */
    async rotateSecret(id, reason = 'manual', newValue, rotatedBy = 'system') {
        const metadata = await this.getSecretMetadata(id);
        if (!metadata) {
            throw new Error(`Secret ${id} not found`);
        }
        const policy = this.policies.get(metadata.type);
        // Execute pre-rotation hook
        if (policy?.preRotationHook) {
            await policy.preRotationHook();
        }
        // Generate new value if not provided
        const secretValue = newValue || this.generateSecret(metadata.type);
        // Validate new secret if validation function exists
        if (policy?.validationFn) {
            const isValid = await policy.validationFn(secretValue);
            if (!isValid) {
                throw new Error('Secret validation failed');
            }
        }
        const previousVersion = metadata.version;
        const newVersion = metadata.version + 1;
        const now = new Date();
        // Update metadata
        metadata.version = newVersion;
        metadata.rotatedAt = now;
        metadata.rotatedBy = rotatedBy;
        metadata.expiresAt = new Date(now.getTime() + (policy?.rotationIntervalMs || 90 * 24 * 60 * 60 * 1000));
        metadata.status = 'active';
        // Store new version
        const encryptedValue = this.config.encryptAtRest
            ? this.encrypt(secretValue)
            : secretValue;
        await Promise.all([
            this.redis.set(`${id}:metadata`, JSON.stringify(metadata)),
            this.redis.set(`${id}:value:${newVersion}`, encryptedValue),
        ]);
        // Deprecate old version (keep for grace period)
        await this.redis.expire(`${id}:value:${previousVersion}`, Math.floor(this.config.gracePeriodMs / 1000));
        // Cleanup old versions
        await this.cleanupOldVersions(id);
        // Execute post-rotation hook
        if (policy?.postRotationHook) {
            await policy.postRotationHook(secretValue);
        }
        const rotationEvent = {
            secretId: id,
            secretType: metadata.type,
            previousVersion,
            newVersion,
            rotatedAt: now,
            rotatedBy,
            reason,
        };
        logger_js_1.default.info('Secret rotated', {
            id,
            type: metadata.type,
            previousVersion,
            newVersion,
            reason,
            rotatedBy,
        });
        this.emit('secret:rotated', rotationEvent);
        return metadata;
    }
    /**
     * Revoke a secret (immediate invalidation)
     */
    async revokeSecret(id, reason = 'manual') {
        const metadata = await this.getSecretMetadata(id);
        if (!metadata) {
            throw new Error(`Secret ${id} not found`);
        }
        metadata.status = 'revoked';
        await this.redis.set(`${id}:metadata`, JSON.stringify(metadata));
        // Delete all versions
        const versions = await this.redis.keys(`${id}:value:*`);
        if (versions.length > 0) {
            await this.redis.del(...versions);
        }
        logger_js_1.default.warn('Secret revoked', {
            id,
            type: metadata.type,
            reason,
        });
        this.emit('secret:revoked', { id, type: metadata.type, reason });
    }
    /**
     * Cleanup old secret versions
     */
    async cleanupOldVersions(id) {
        const metadata = await this.getSecretMetadata(id);
        if (!metadata)
            return;
        const versionKeys = await this.redis.keys(`${id}:value:*`);
        const versions = versionKeys
            .map((key) => parseInt(key.split(':').pop() || '0', 10))
            .sort((a, b) => b - a);
        // Keep only maxVersionsRetained versions
        const versionsToDelete = versions.slice(this.config.maxVersionsRetained);
        for (const version of versionsToDelete) {
            await this.redis.del(`${id}:value:${version}`);
            logger_js_1.default.debug('Deleted old secret version', { id, version });
        }
    }
    /**
     * Generate a new secret value based on type
     */
    generateSecret(type) {
        switch (type) {
            case 'jwt-signing':
            case 'jwt-refresh':
                return crypto_1.default.randomBytes(64).toString('base64');
            case 'api-key':
                return `sk_${crypto_1.default.randomBytes(32).toString('hex')}`;
            case 'webhook':
                return `whsec_${crypto_1.default.randomBytes(24).toString('base64url')}`;
            case 'encryption':
                return crypto_1.default.randomBytes(32).toString('hex');
            case 'database':
                return crypto_1.default.randomBytes(24).toString('base64url');
            case 'service-account':
                return crypto_1.default.randomBytes(48).toString('base64');
            case 'oidc-client':
                return crypto_1.default.randomBytes(32).toString('hex');
            default:
                return crypto_1.default.randomBytes(32).toString('hex');
        }
    }
    /**
     * Encrypt value at rest
     */
    encrypt(value) {
        const iv = crypto_1.default.randomBytes(16);
        const cipher = crypto_1.default.createCipheriv('aes-256-gcm', this.masterKey, iv);
        let encrypted = cipher.update(value, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        const authTag = cipher.getAuthTag();
        return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
    }
    /**
     * Decrypt value
     */
    decrypt(encryptedValue) {
        const [ivHex, authTagHex, encrypted] = encryptedValue.split(':');
        const iv = Buffer.from(ivHex, 'hex');
        const authTag = Buffer.from(authTagHex, 'hex');
        const decipher = crypto_1.default.createDecipheriv('aes-256-gcm', this.masterKey, iv);
        decipher.setAuthTag(authTag);
        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    }
    /**
     * Add custom rotation policy
     */
    addPolicy(policy) {
        this.policies.set(policy.type, policy);
        logger_js_1.default.info('Secret rotation policy added', {
            type: policy.type,
            rotationInterval: `${policy.rotationIntervalMs / (24 * 60 * 60 * 1000)} days`,
            autoRotate: policy.autoRotate,
        });
    }
    /**
     * Get all secrets metadata
     */
    async listSecrets(type) {
        const ids = type
            ? await this.redis.smembers(`secret:type:${type}`)
            : await this.redis.smembers('secret:ids');
        const secrets = [];
        for (const id of ids) {
            const metadata = await this.getSecretMetadata(id);
            if (metadata) {
                secrets.push(metadata);
            }
        }
        return secrets;
    }
    /**
     * Get rotation status
     */
    async getRotationStatus() {
        const allSecrets = await this.listSecrets();
        const now = Date.now();
        const sevenDaysFromNow = now + 7 * 24 * 60 * 60 * 1000;
        const byType = {};
        let expiringWithin7Days = 0;
        let expiredCount = 0;
        let rotationsPending = 0;
        for (const secret of allSecrets) {
            byType[secret.type] = (byType[secret.type] || 0) + 1;
            const expiresAt = new Date(secret.expiresAt).getTime();
            if (expiresAt < now) {
                expiredCount++;
            }
            else if (expiresAt < sevenDaysFromNow) {
                expiringWithin7Days++;
            }
            if (secret.status === 'pending-rotation') {
                rotationsPending++;
            }
        }
        return {
            totalSecrets: allSecrets.length,
            byType,
            expiringWithin7Days,
            expiredCount,
            rotationsPending,
        };
    }
    /**
     * Health check
     */
    async healthCheck() {
        try {
            const ping = await this.redis.ping();
            const rotationStatus = await this.getRotationStatus();
            const isHealthy = ping === 'PONG' && rotationStatus.expiredCount === 0;
            const isDegraded = rotationStatus.expiringWithin7Days > 0;
            return {
                status: isHealthy ? (isDegraded ? 'degraded' : 'healthy') : 'unhealthy',
                details: {
                    redis: ping === 'PONG' ? 'connected' : 'disconnected',
                    rotationSchedulerActive: !!this.rotationTimer,
                    ...rotationStatus,
                },
            };
        }
        catch (error) {
            return {
                status: 'unhealthy',
                details: {
                    error: error instanceof Error ? error.message : String(error),
                },
            };
        }
    }
    /**
     * Shutdown
     */
    async shutdown() {
        if (this.rotationTimer) {
            clearInterval(this.rotationTimer);
            this.rotationTimer = null;
        }
        await this.redis.quit();
        this.isInitialized = false;
        logger_js_1.default.info('Secret rotation manager shutdown complete');
    }
}
exports.SecretRotationManager = SecretRotationManager;
// ============================================================================
// Singleton Instance
// ============================================================================
let secretManagerInstance = null;
function getSecretRotationManager(redisUrl, config) {
    if (!secretManagerInstance) {
        secretManagerInstance = new SecretRotationManager(redisUrl, config);
    }
    return secretManagerInstance;
}
function resetSecretRotationManager() {
    secretManagerInstance = null;
}
