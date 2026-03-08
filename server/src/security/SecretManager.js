"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SecretManager = void 0;
const logger_js_1 = __importDefault(require("../config/logger.js"));
/**
 * SecretManager
 *
 * Centralized manager for accessing sensitive secrets with:
 * - Audit logging
 * - "Break-glass" access control
 * - OPA validation (simulated/placeholder)
 */
class SecretManager {
    static instance;
    secrets = new Map();
    constructor() {
        // Initialize with process.env
        // In a real system, this might fetch from Vault/AWS Secrets Manager
        // For now, we seed from env but control access
        this.seedFromEnv();
    }
    static getInstance() {
        if (!SecretManager.instance) {
            SecretManager.instance = new SecretManager();
        }
        return SecretManager.instance;
    }
    seedFromEnv() {
        // Load known sensitive keys
        const sensitiveKeys = [
            'JWT_SECRET',
            'JWT_REFRESH_SECRET',
            'OPENAI_API_KEY',
            'NEO4J_PASSWORD',
            'POSTGRES_PASSWORD',
            'REDIS_PASSWORD',
            'ENCRYPTION_KEY'
        ];
        for (const key of sensitiveKeys) {
            if (process.env[key]) {
                this.secrets.set(key, process.env[key]);
            }
        }
        // Support rotation for JWT
        if (process.env.JWT_SECRET_OLD) {
            this.secrets.set('JWT_SECRET_OLD', process.env.JWT_SECRET_OLD);
        }
    }
    /**
     * Get a secret with audit logging and policy check
     */
    getSecret(key, context) {
        this.validateAccess(key, context);
        logger_js_1.default.debug({
            msg: 'Secret accessed',
            key,
            userId: context.userId,
            purpose: context.purpose
        });
        return this.secrets.get(key);
    }
    /**
     * Break-glass access
     * Logs a high-severity security alert.
     * Only allows admins.
     */
    getSecretBreakGlass(key, context) {
        // 1. Strict OPA Check (Simulated)
        if (context.role !== 'ADMIN') {
            logger_js_1.default.error({
                msg: 'Break-glass access denied',
                key,
                userId: context.userId,
                role: context.role
            });
            throw new Error('Access Denied: Break-glass requires ADMIN role');
        }
        // 2. High-severity Audit Log
        logger_js_1.default.error({
            msg: 'SECURITY ALERT: BREAK-GLASS SECRET ACCESS',
            key,
            userId: context.userId,
            purpose: context.purpose,
            ip: context.ipAddress,
            timestamp: new Date().toISOString()
        });
        return this.secrets.get(key);
    }
    validateAccess(key, context) {
        // Placeholder for OPA check
        // In production: await opa.evaluatePolicy('secrets/access', { key, user: context })
        // Basic invariant: Context must exist
        if (!context || !context.userId) {
            throw new Error('Access Denied: specific context required for secret access');
        }
    }
}
exports.SecretManager = SecretManager;
