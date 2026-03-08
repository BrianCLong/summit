"use strict";
/**
 * Federated Campaign Radar
 *
 * Privacy-preserving cross-organization campaign signal sharing
 * for coordinated information warfare defense.
 *
 * Key Features:
 * - Signal normalization with C2PA content credentials support
 * - Privacy-preserving federation using differential privacy
 * - Federated narrative clustering with privacy budgets
 * - Credential-aware indicator exchange protocol
 * - Early-warning alerts with cross-tenant detection
 * - Automated response pack generation
 * - NIST AI RMF aligned audit trail
 *
 * Three Patentable Primitives:
 * 1. Federated Narrative Clustering with Privacy Budgets
 * 2. Credential-Aware Indicator Exchange Protocol
 * 3. Actionable Early-Warning Threshold System
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
exports.VERSION = exports.EVENTS = exports.pubsub = exports.resolvers = exports.schema = exports.AuditService = exports.AlertEngine = exports.ClusteringEngine = exports.FederationService = exports.SignalNormalizer = void 0;
exports.createFederatedCampaignRadar = createFederatedCampaignRadar;
// Core Types
__exportStar(require("./core/types"), exports);
// Signal Normalization
var SignalNormalizer_1 = require("./core/SignalNormalizer");
Object.defineProperty(exports, "SignalNormalizer", { enumerable: true, get: function () { return SignalNormalizer_1.SignalNormalizer; } });
// Federation Service
var FederationService_1 = require("./federation/FederationService");
Object.defineProperty(exports, "FederationService", { enumerable: true, get: function () { return FederationService_1.FederationService; } });
// Clustering Engine
var ClusteringEngine_1 = require("./clustering/ClusteringEngine");
Object.defineProperty(exports, "ClusteringEngine", { enumerable: true, get: function () { return ClusteringEngine_1.ClusteringEngine; } });
// Alert Engine
var AlertEngine_1 = require("./alerts/AlertEngine");
Object.defineProperty(exports, "AlertEngine", { enumerable: true, get: function () { return AlertEngine_1.AlertEngine; } });
// Audit Service
var AuditService_1 = require("./audit/AuditService");
Object.defineProperty(exports, "AuditService", { enumerable: true, get: function () { return AuditService_1.AuditService; } });
// GraphQL
var schema_1 = require("./graphql/schema");
Object.defineProperty(exports, "schema", { enumerable: true, get: function () { return schema_1.schema; } });
var resolvers_1 = require("./graphql/resolvers");
Object.defineProperty(exports, "resolvers", { enumerable: true, get: function () { return resolvers_1.resolvers; } });
Object.defineProperty(exports, "pubsub", { enumerable: true, get: function () { return resolvers_1.pubsub; } });
Object.defineProperty(exports, "EVENTS", { enumerable: true, get: function () { return resolvers_1.EVENTS; } });
// Version
exports.VERSION = '1.0.0';
/**
 * Create a fully configured Federated Campaign Radar instance
 */
function createFederatedCampaignRadar(config) {
    const { participantId, organizationId, privacyLevel, enableC2PA, enableAudit, } = config;
    // Privacy level presets
    const privacyPresets = {
        strict: { epsilon: 0.1, delta: 1e-8, minParticipants: 5 },
        balanced: { epsilon: 0.5, delta: 1e-6, minParticipants: 3 },
        permissive: { epsilon: 1.0, delta: 1e-5, minParticipants: 2 },
    };
    const privacySettings = privacyPresets[privacyLevel];
    // Initialize Signal Normalizer
    const signalNormalizer = new SignalNormalizer({
        enableC2PAValidation: enableC2PA,
        hashPepper: process.env.SIGNAL_HASH_PEPPER || 'default-pepper-change-in-production',
        embeddingDimension: 768,
    });
    // Initialize Federation Service
    const federationService = new FederationService({
        participantId,
        organizationId,
        epsilon: privacySettings.epsilon,
        delta: privacySettings.delta,
        minParticipantsForAggregation: privacySettings.minParticipants,
        enableSecureAggregation: true,
        ...config.federation,
    });
    // Initialize Clustering Engine
    const clusteringEngine = new ClusteringEngine(federationService, {
        similarityThreshold: 0.75,
        minClusterSize: 3,
        crossTenantBoostFactor: 1.5,
        ...config.clustering,
    });
    // Initialize Alert Engine
    const alertEngine = new AlertEngine(clusteringEngine, federationService, {
        defaultCooldownMs: 3600000, // 1 hour
        maxActiveAlerts: 100,
        enableAutoEscalation: true,
        ...config.alerts,
    });
    // Initialize Audit Service (optional)
    let auditService;
    if (enableAudit) {
        auditService = new AuditService({
            organizationId,
            retentionDays: 365,
            enableIntegrityChecks: true,
            ...config.audit,
        });
        // Wire up audit logging
        signalNormalizer.on?.('signal:normalized', (signal) => {
            auditService.logEvent({
                eventType: 'SIGNAL_SUBMISSION',
                category: 'DATA_PROCESSING',
                action: 'NORMALIZE_SIGNAL',
                resourceType: 'SIGNAL',
                resourceId: signal.id,
                outcome: 'SUCCESS',
                details: {
                    signalType: signal.signalType,
                    privacyLevel: signal.privacyLevel,
                },
            });
        });
    }
    // Create resolver context
    const createResolverContext = () => ({
        signalNormalizer,
        federationService,
        clusteringEngine,
        alertEngine,
        participantId,
        organizationId,
    });
    return {
        signalNormalizer,
        federationService,
        clusteringEngine,
        alertEngine,
        auditService,
        createResolverContext,
        // Convenience methods
        async submitSignal(input) {
            const signal = await signalNormalizer.normalizeNarrative(input);
            await federationService.submitSignal(signal);
            clusteringEngine.addSignal(signal);
            return signal;
        },
        async runClustering() {
            const clusters = await clusteringEngine.performClustering();
            const previousStates = new Map();
            await alertEngine.evaluateClusters(clusters, previousStates);
            return clusters;
        },
        getActiveAlerts() {
            return alertEngine.getActiveAlerts();
        },
        getActiveClusters(minThreatLevel) {
            return clusteringEngine.getActiveClusters(minThreatLevel);
        },
    };
}
