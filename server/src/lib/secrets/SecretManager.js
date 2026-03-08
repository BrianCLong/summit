"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SecretManager = void 0;
const EnvSecretProvider_js_1 = require("./providers/EnvSecretProvider.js");
const VaultSecretProvider_js_1 = require("./providers/VaultSecretProvider.js");
const logger_js_1 = require("../../config/logger.js");
const audit_js_1 = require("../../utils/audit.js");
class SecretManager {
    static instance;
    provider;
    constructor(config) {
        if (config.provider === 'vault' && config.vaultUrl && config.vaultToken) {
            this.provider = new VaultSecretProvider_js_1.VaultSecretProvider(config.vaultUrl, config.vaultToken);
        }
        else {
            if (config.provider === 'vault') {
                logger_js_1.logger.warn('Vault configured but missing URL/Token, falling back to Env');
            }
            this.provider = new EnvSecretProvider_js_1.EnvSecretProvider();
        }
    }
    static async initialize(config) {
        if (!SecretManager.instance) {
            // Default to env if not configured
            const finalConfig = config || {
                provider: process.env.SECRET_PROVIDER || 'env',
                vaultUrl: process.env.VAULT_ADDR,
                vaultToken: process.env.VAULT_TOKEN,
            };
            SecretManager.instance = new SecretManager(finalConfig);
            await SecretManager.instance.provider.initialize();
            logger_js_1.logger.info(`SecretManager initialized with provider: ${finalConfig.provider}`);
        }
    }
    static getInstance() {
        if (!SecretManager.instance) {
            throw new Error('SecretManager not initialized. Call initialize() first.');
        }
        return SecretManager.instance;
    }
    async getSecret(key, context) {
        const start = Date.now();
        const value = await this.provider.getSecret(key);
        // Audit Log
        try {
            await (0, audit_js_1.writeAudit)({
                action: 'ACCESS_SECRET',
                resourceType: 'secret',
                resourceId: key,
                details: {
                    requester: context.requester,
                    purpose: context.purpose,
                    success: !!value,
                    durationMs: Date.now() - start
                },
                actorRole: 'system' // or passed in context
            });
        }
        catch (err) {
            // Don't fail secret retrieval if audit fails, but log error
            logger_js_1.logger.error(`Failed to audit secret access for ${key}: ${err}`);
        }
        if (!value) {
            throw new Error(`Secret ${key} not found`);
        }
        return value;
    }
    /**
     * Loads critical secrets into process.env to support legacy code.
     * This is a bridge method.
     */
    async loadSecretsToEnv(keys) {
        for (const key of keys) {
            const value = await this.provider.getSecret(key);
            if (value) {
                process.env[key] = value;
            }
        }
    }
    async rotateSecret(key) {
        const newValue = await this.provider.rotateSecret(key);
        // If we are syncing to env
        process.env[key] = newValue;
        await (0, audit_js_1.writeAudit)({
            action: 'ROTATE_SECRET',
            resourceType: 'secret',
            resourceId: key,
            details: {
                timestamp: new Date().toISOString()
            }
        });
    }
}
exports.SecretManager = SecretManager;
