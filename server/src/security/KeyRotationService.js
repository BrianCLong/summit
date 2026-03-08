"use strict";
// @ts-nocheck
/**
 * Key Rotation Service
 *
 * Manages encryption key lifecycle including generation, rotation, and retirement.
 *
 * SOC 2 Controls: CC6.1 (Logical Access), CC6.7 (Encryption)
 *
 * @module security/KeyRotationService
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.keyRotationService = exports.KeyRotationService = void 0;
const uuid_1 = require("uuid");
const crypto_1 = __importDefault(require("crypto"));
const data_envelope_js_1 = require("../types/data-envelope.js");
const logger_js_1 = __importDefault(require("../utils/logger.js"));
// ============================================================================
// Default Rotation Policies
// ============================================================================
const DEFAULT_POLICIES = [
    {
        purpose: 'encryption',
        rotationIntervalDays: 90,
        maxVersions: 3,
        autoRotate: true,
        notifyDaysBefore: 14,
    },
    {
        purpose: 'signing',
        rotationIntervalDays: 365,
        maxVersions: 2,
        autoRotate: true,
        notifyDaysBefore: 30,
    },
    {
        purpose: 'authentication',
        rotationIntervalDays: 30,
        maxVersions: 2,
        autoRotate: true,
        notifyDaysBefore: 7,
    },
    {
        purpose: 'key_wrapping',
        rotationIntervalDays: 180,
        maxVersions: 2,
        autoRotate: true,
        notifyDaysBefore: 21,
    },
];
// ============================================================================
// Key Rotation Service Implementation
// ============================================================================
class KeyRotationService {
    keys = new Map();
    keyMaterial = new Map(); // In production, use HSM/KMS
    policies = new Map();
    rotationEvents = [];
    constructor() {
        // Initialize default policies
        DEFAULT_POLICIES.forEach((policy) => {
            this.policies.set(policy.purpose, policy);
        });
        logger_js_1.default.info('Key rotation service initialized');
    }
    // --------------------------------------------------------------------------
    // Key Management
    // --------------------------------------------------------------------------
    async generateKey(purpose, algorithm, tenantId, actorId) {
        const policy = this.policies.get(purpose);
        const expiresAt = policy
            ? new Date(Date.now() + policy.rotationIntervalDays * 24 * 60 * 60 * 1000).toISOString()
            : undefined;
        const key = {
            id: (0, uuid_1.v4)(),
            purpose,
            algorithm,
            status: 'active',
            version: 1,
            createdAt: new Date().toISOString(),
            expiresAt,
            createdBy: actorId,
            tenantId,
        };
        // Generate actual key material
        const keyMaterial = this.generateKeyMaterial(algorithm);
        this.keyMaterial.set(key.id, keyMaterial);
        this.keys.set(key.id, key);
        // Log event
        this.logEvent({
            keyId: key.id,
            eventType: 'created',
            newVersion: key.version,
            actorId,
            reason: `New ${purpose} key generated`,
        });
        logger_js_1.default.info({ keyId: key.id, purpose, algorithm, tenantId }, 'Encryption key generated');
        return {
            data: key,
            provenance: {
                sources: [{ id: 'key-rotation-service', type: 'system' }],
                confidence: 1.0,
            },
            governance: {
                verdict: data_envelope_js_1.GovernanceResult.ALLOW,
                evaluatedPolicies: [],
                enforcedAt: new Date().toISOString(),
            },
            meta: {
                generatedAt: new Date().toISOString(),
            },
        };
    }
    async rotateKey(keyId, actorId, reason) {
        const existingKey = this.keys.get(keyId);
        if (!existingKey) {
            throw new Error(`Key not found: ${keyId}`);
        }
        if (existingKey.status !== 'active') {
            throw new Error(`Cannot rotate key with status: ${existingKey.status}`);
        }
        const policy = this.policies.get(existingKey.purpose);
        const expiresAt = policy
            ? new Date(Date.now() + policy.rotationIntervalDays * 24 * 60 * 60 * 1000).toISOString()
            : undefined;
        // Mark existing key for retirement
        existingKey.status = 'rotating';
        existingKey.retiredAt = new Date().toISOString();
        // Create new key version
        const newKey = {
            id: (0, uuid_1.v4)(),
            purpose: existingKey.purpose,
            algorithm: existingKey.algorithm,
            status: 'active',
            version: existingKey.version + 1,
            createdAt: new Date().toISOString(),
            rotatedAt: new Date().toISOString(),
            expiresAt,
            createdBy: actorId,
            tenantId: existingKey.tenantId,
            metadata: {
                previousKeyId: existingKey.id,
            },
        };
        // Generate new key material
        const keyMaterial = this.generateKeyMaterial(existingKey.algorithm);
        this.keyMaterial.set(newKey.id, keyMaterial);
        this.keys.set(newKey.id, newKey);
        // Retire old key after grace period (in production, schedule this)
        setTimeout(() => {
            existingKey.status = 'retired';
        }, 7 * 24 * 60 * 60 * 1000); // 7 days grace period
        // Log events
        this.logEvent({
            keyId: existingKey.id,
            eventType: 'rotated',
            previousVersion: existingKey.version,
            actorId,
            reason: reason || 'Scheduled rotation',
        });
        this.logEvent({
            keyId: newKey.id,
            eventType: 'created',
            newVersion: newKey.version,
            actorId,
            reason: `Rotation from key ${existingKey.id}`,
        });
        logger_js_1.default.info({ oldKeyId: existingKey.id, newKeyId: newKey.id, version: newKey.version }, 'Key rotated');
        return {
            data: newKey,
            provenance: {
                sources: [{ id: 'key-rotation-service', type: 'system' }],
                confidence: 1.0,
            },
            governance: {
                verdict: data_envelope_js_1.GovernanceResult.ALLOW,
                evaluatedPolicies: [],
                enforcedAt: new Date().toISOString(),
            },
            meta: {
                generatedAt: new Date().toISOString(),
            },
        };
    }
    async retireKey(keyId, actorId, reason) {
        const key = this.keys.get(keyId);
        if (!key) {
            throw new Error(`Key not found: ${keyId}`);
        }
        key.status = 'retired';
        key.retiredAt = new Date().toISOString();
        this.logEvent({
            keyId,
            eventType: 'retired',
            previousVersion: key.version,
            actorId,
            reason: reason || 'Manual retirement',
        });
        logger_js_1.default.info({ keyId }, 'Key retired');
        return {
            data: key,
            provenance: {
                sources: [{ id: 'key-rotation-service', type: 'system' }],
                confidence: 1.0,
            },
            governance: {
                verdict: data_envelope_js_1.GovernanceResult.ALLOW,
                evaluatedPolicies: [],
                enforcedAt: new Date().toISOString(),
            },
            meta: {
                generatedAt: new Date().toISOString(),
            },
        };
    }
    async markCompromised(keyId, actorId, reason) {
        const key = this.keys.get(keyId);
        if (!key) {
            throw new Error(`Key not found: ${keyId}`);
        }
        key.status = 'compromised';
        this.logEvent({
            keyId,
            eventType: 'compromised',
            previousVersion: key.version,
            actorId,
            reason,
        });
        logger_js_1.default.warn({ keyId, reason }, 'Key marked as compromised');
        return {
            data: key,
            provenance: {
                sources: [{ id: 'key-rotation-service', type: 'system' }],
                confidence: 1.0,
            },
            governance: {
                verdict: data_envelope_js_1.GovernanceResult.FLAG,
                evaluatedPolicies: [],
                enforcedAt: new Date().toISOString(),
            },
            meta: {
                generatedAt: new Date().toISOString(),
            },
        };
    }
    // --------------------------------------------------------------------------
    // Key Inventory
    // --------------------------------------------------------------------------
    getKeyInventory(tenantId, filters) {
        let keys = Array.from(this.keys.values()).filter((k) => k.tenantId === tenantId);
        if (filters?.purpose) {
            keys = keys.filter((k) => k.purpose === filters.purpose);
        }
        if (filters?.status) {
            keys = keys.filter((k) => k.status === filters.status);
        }
        return {
            data: keys,
            provenance: {
                sources: [{ id: 'key-rotation-service', type: 'system' }],
                confidence: 1.0,
            },
            governance: {
                verdict: data_envelope_js_1.GovernanceResult.ALLOW,
                evaluatedPolicies: [],
                enforcedAt: new Date().toISOString(),
            },
            meta: {
                generatedAt: new Date().toISOString(),
            },
        };
    }
    getKeysNearingExpiry(tenantId, daysAhead = 14) {
        const cutoffDate = new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000).toISOString();
        const expiringKeys = Array.from(this.keys.values()).filter((k) => k.tenantId === tenantId &&
            k.status === 'active' &&
            k.expiresAt &&
            k.expiresAt <= cutoffDate);
        return {
            data: expiringKeys,
            provenance: {
                sources: [{ id: 'key-rotation-service', type: 'system' }],
                confidence: 1.0,
            },
            governance: {
                verdict: data_envelope_js_1.GovernanceResult.ALLOW,
                evaluatedPolicies: [],
                enforcedAt: new Date().toISOString(),
            },
            meta: {
                generatedAt: new Date().toISOString(),
            },
        };
    }
    // --------------------------------------------------------------------------
    // Rotation History
    // --------------------------------------------------------------------------
    getRotationHistory(tenantId, keyId) {
        let events = this.rotationEvents;
        if (keyId) {
            events = events.filter((e) => e.keyId === keyId);
        }
        else {
            // Filter by tenant's keys
            const tenantKeyIds = new Set(Array.from(this.keys.values())
                .filter((k) => k.tenantId === tenantId)
                .map((k) => k.id));
            events = events.filter((e) => tenantKeyIds.has(e.keyId));
        }
        return {
            data: events.slice(-100), // Last 100 events
            provenance: {
                sources: [{ id: 'key-rotation-service', type: 'system' }],
                confidence: 1.0,
            },
            governance: {
                verdict: data_envelope_js_1.GovernanceResult.ALLOW,
                evaluatedPolicies: [],
                enforcedAt: new Date().toISOString(),
            },
            meta: {
                generatedAt: new Date().toISOString(),
            },
        };
    }
    // --------------------------------------------------------------------------
    // Policy Management
    // --------------------------------------------------------------------------
    getRotationPolicies() {
        return {
            data: Array.from(this.policies.values()),
            provenance: {
                sources: [{ id: 'key-rotation-service', type: 'system' }],
                confidence: 1.0,
            },
            governance: {
                verdict: data_envelope_js_1.GovernanceResult.ALLOW,
                evaluatedPolicies: [],
                enforcedAt: new Date().toISOString(),
            },
            meta: {
                generatedAt: new Date().toISOString(),
            },
        };
    }
    updateRotationPolicy(purpose, policy) {
        const existing = this.policies.get(purpose);
        if (!existing) {
            throw new Error(`Policy not found for purpose: ${purpose}`);
        }
        const updated = { ...existing, ...policy, purpose };
        this.policies.set(purpose, updated);
        logger_js_1.default.info({ purpose, policy: updated }, 'Rotation policy updated');
        return {
            data: updated,
            provenance: {
                sources: [{ id: 'key-rotation-service', type: 'system' }],
                confidence: 1.0,
            },
            governance: {
                verdict: data_envelope_js_1.GovernanceResult.ALLOW,
                evaluatedPolicies: [],
                enforcedAt: new Date().toISOString(),
            },
            meta: {
                generatedAt: new Date().toISOString(),
            },
        };
    }
    // --------------------------------------------------------------------------
    // Helpers
    // --------------------------------------------------------------------------
    generateKeyMaterial(algorithm) {
        switch (algorithm) {
            case 'AES-256-GCM':
                return crypto_1.default.randomBytes(32);
            case 'HMAC-SHA256':
                return crypto_1.default.randomBytes(32);
            case 'RSA-2048':
            case 'RSA-4096':
            case 'ECDSA-P256':
                // In production, use proper key pair generation
                return crypto_1.default.randomBytes(256);
            default:
                return crypto_1.default.randomBytes(32);
        }
    }
    logEvent(event) {
        const fullEvent = {
            id: (0, uuid_1.v4)(),
            timestamp: new Date().toISOString(),
            ...event,
        };
        this.rotationEvents.push(fullEvent);
        logger_js_1.default.info({ event: fullEvent }, 'Key rotation event logged');
    }
}
exports.KeyRotationService = KeyRotationService;
// Export singleton
exports.keyRotationService = new KeyRotationService();
exports.default = KeyRotationService;
