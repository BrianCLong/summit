"use strict";
/**
 * Zero-Trust Architecture Enhancement Module
 *
 * Provides hardware-rooted trust, confidential computing integration,
 * and immutable audit capabilities for zero-trust security.
 *
 * @module security/zero-trust
 * @version 4.0.0-alpha
 */
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
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ZeroTrustService = exports.createImmutableAuditService = exports.AuditError = exports.ImmutableAuditServiceImpl = exports.createHSMService = exports.HSMError = exports.HSMServiceImpl = void 0;
exports.createZeroTrustService = createZeroTrustService;
exports.getZeroTrustService = getZeroTrustService;
// Types
__exportStar(require("./types.js"), exports);
// Services
var HSMService_js_1 = require("./HSMService.js");
Object.defineProperty(exports, "HSMServiceImpl", { enumerable: true, get: function () { return HSMService_js_1.HSMServiceImpl; } });
Object.defineProperty(exports, "HSMError", { enumerable: true, get: function () { return HSMService_js_1.HSMError; } });
Object.defineProperty(exports, "createHSMService", { enumerable: true, get: function () { return HSMService_js_1.createHSMService; } });
var ImmutableAuditService_js_1 = require("./ImmutableAuditService.js");
Object.defineProperty(exports, "ImmutableAuditServiceImpl", { enumerable: true, get: function () { return ImmutableAuditService_js_1.ImmutableAuditServiceImpl; } });
Object.defineProperty(exports, "AuditError", { enumerable: true, get: function () { return ImmutableAuditService_js_1.AuditError; } });
Object.defineProperty(exports, "createImmutableAuditService", { enumerable: true, get: function () { return ImmutableAuditService_js_1.createImmutableAuditService; } });
// Unified Zero-Trust Service
const HSMService_js_2 = require("./HSMService.js");
const ImmutableAuditService_js_2 = require("./ImmutableAuditService.js");
/**
 * Unified Zero-Trust Security Service
 *
 * Provides a single interface to all zero-trust security capabilities
 * including HSM operations, immutable audit logging, and session management.
 */
class ZeroTrustService {
    config;
    hsm;
    audit;
    initialized = false;
    constructor(config = {}) {
        this.config = config;
        this.hsm = (0, HSMService_js_2.createHSMService)(config.hsm);
        this.audit = (0, ImmutableAuditService_js_2.createImmutableAuditService)(config.audit);
    }
    /**
     * Initialize all zero-trust services
     */
    async initialize() {
        if (this.initialized) {
            return;
        }
        // Initialize HSM service
        await this.hsm.initialize();
        // Generate audit signing key in HSM
        const signingKey = await this.hsm.generateKey({
            keyType: 'EC',
            curve: 'P-256',
            purpose: ['sign', 'verify'],
            extractable: false,
            persistent: true,
            labels: { name: 'audit-signing-key', usage: 'audit-ledger' },
        });
        // Record initialization event
        await this.audit.recordEvent({
            timestamp: new Date().toISOString(),
            entryType: 'security_event',
            payload: {
                event: 'zero_trust_initialized',
                signingKeyId: signingKey.id,
                hsmProvider: signingKey.providerId,
            },
            metadata: {
                actorId: 'system',
                actorType: 'system',
                tenantId: 'system',
                resourceType: 'zero-trust-service',
                resourceId: 'initialization',
                action: 'initialize',
                outcome: 'success',
            },
        });
        this.initialized = true;
    }
    /**
     * Check if services are initialized
     */
    isInitialized() {
        return this.initialized;
    }
    /**
     * Record a security-relevant event
     */
    async recordSecurityEvent(actorId, actorType, tenantId, action, details) {
        const entry = await this.audit.recordEvent({
            timestamp: new Date().toISOString(),
            entryType: 'security_event',
            payload: details,
            metadata: {
                actorId,
                actorType,
                tenantId,
                resourceType: 'security',
                resourceId: details.resourceId || 'unknown',
                action,
                outcome: 'success',
            },
        });
        return entry.id;
    }
    /**
     * Verify audit chain integrity
     */
    async verifyAuditIntegrity(startTime, endTime) {
        const entries = await this.audit.queryEntries({
            startTime,
            endTime,
            limit: 10000,
        });
        if (entries.length === 0) {
            return { valid: true, entriesVerified: 0 };
        }
        const startSequence = entries[0].sequence;
        const endSequence = entries[entries.length - 1].sequence;
        const result = await this.audit.verifyChain(startSequence, endSequence);
        return {
            valid: result.valid,
            entriesVerified: result.entriesVerified,
            brokenAt: result.brokenAt,
        };
    }
}
exports.ZeroTrustService = ZeroTrustService;
/**
 * Create a new Zero-Trust Service instance
 */
function createZeroTrustService(config) {
    return new ZeroTrustService(config);
}
// Default singleton instance
let defaultInstance = null;
/**
 * Get the default Zero-Trust Service instance
 */
function getZeroTrustService() {
    if (!defaultInstance) {
        defaultInstance = createZeroTrustService();
    }
    return defaultInstance;
}
exports.default = ZeroTrustService;
