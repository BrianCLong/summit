"use strict";
/**
 * @fileoverview Secrets Management Service
 *
 * Centralizes access to secrets, credentials, and sensitive configuration.
 * Abstraction layer to allow future migration to Vault or AWS Secrets Manager.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.secretsService = exports.SecretsService = void 0;
const logger_js_1 = __importDefault(require("../utils/logger.js"));
const dotenv_1 = __importDefault(require("dotenv"));
// Ensure env vars are loaded
dotenv_1.default.config();
class SecretsService {
    static instance;
    envCache = new Map();
    constructor() {
        // Initialize with process.env
        for (const key in process.env) {
            if (process.env[key]) {
                this.envCache.set(key, process.env[key]);
            }
        }
    }
    static getInstance() {
        if (!SecretsService.instance) {
            SecretsService.instance = new SecretsService();
        }
        return SecretsService.instance;
    }
    /**
     * Retrieves a secret based on the provided reference.
     * Currently backed by process.env, but designed to support async fetch from Vault.
     *
     * @param ref The secret reference containing ID and metadata
     * @returns The secret value
     * @throws Error if the secret is not found (and not in development mode with fallback)
     */
    async getSecret(ref) {
        // In a real implementation, we might check a Vault here based on scope/kind
        // For now, we map ref.id to environment variable name
        const envVarName = ref.id;
        const value = this.envCache.get(envVarName);
        if (!value) {
            // Allow fallback for development if strictly necessary, or throw
            if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
                logger_js_1.default.warn(`Secret ${ref.id} not found in environment. Using mock/fallback if available.`);
                // potentially return a mock if defined, or fall through to throw
            }
            throw new Error(`Secret not found: ${ref.id}`);
        }
        return value;
    }
    /**
     * Retrieves a tenant-specific secret.
     * This would typically query a secure store or Vault path: /secrets/tenants/{tenantId}/{key}
     */
    async getTenantSecret(tenantId, key) {
        // Placeholder: Look for env var format TENANT_{ID}_{KEY}
        const envKey = `TENANT_${tenantId}_${key}`.toUpperCase();
        if (this.envCache.has(envKey)) {
            return this.envCache.get(envKey);
        }
        // Future: Check database or Vault
        return undefined;
    }
}
exports.SecretsService = SecretsService;
exports.secretsService = SecretsService.getInstance();
