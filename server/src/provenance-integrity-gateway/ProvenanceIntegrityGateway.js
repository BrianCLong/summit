"use strict";
/**
 * Provenance & Integrity Gateway (PIG)
 *
 * Main orchestrator for the Official Content Firewall providing:
 * - Inbound verification + outbound signing
 * - Impersonation/deepfake response
 * - Audit-ready incident bundles
 * - Optional campaign clustering
 *
 * @see Architecture concept: "Official Content Firewall" for governments/enterprises
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
exports.pig = exports.ProvenanceIntegrityGateway = void 0;
exports.createPIGInstance = createPIGInstance;
const events_1 = require("events");
const pino_1 = __importDefault(require("pino"));
const C2PAValidationService_js_1 = require("./C2PAValidationService.js");
const ContentSigningService_js_1 = require("./ContentSigningService.js");
const DeepfakeDetectionService_js_1 = require("./DeepfakeDetectionService.js");
const TruthBundleService_js_1 = require("./TruthBundleService.js");
const NarrativeConflictService_js_1 = require("./NarrativeConflictService.js");
const PIGGovernanceService_js_1 = require("./PIGGovernanceService.js");
const logger = pino_1.default({ name: 'ProvenanceIntegrityGateway' });
const defaultConfig = {
    enableAll: true,
    enabledServices: {
        c2paValidation: true,
        contentSigning: true,
        deepfakeDetection: true,
        truthBundles: true,
        narrativeConflict: true,
        governance: true,
    },
};
// =============================================================================
// Provenance & Integrity Gateway
// =============================================================================
class ProvenanceIntegrityGateway extends events_1.EventEmitter {
    config;
    // Services
    c2paValidation;
    contentSigning;
    deepfakeDetection;
    truthBundles;
    narrativeConflict;
    governance;
    initialized = false;
    constructor(config = {}) {
        super();
        this.config = { ...defaultConfig, ...config };
        // Initialize services with provided config
        this.c2paValidation = config.c2pa
            ? new C2PAValidationService_js_1.C2PAValidationService(config.c2pa)
            : C2PAValidationService_js_1.c2paValidationService;
        this.contentSigning = config.signing
            ? new ContentSigningService_js_1.ContentSigningService(config.signing)
            : ContentSigningService_js_1.contentSigningService;
        this.deepfakeDetection = config.deepfake
            ? new DeepfakeDetectionService_js_1.DeepfakeDetectionService(config.deepfake)
            : DeepfakeDetectionService_js_1.deepfakeDetectionService;
        this.truthBundles = config.truthBundle
            ? new TruthBundleService_js_1.TruthBundleService(config.truthBundle, this.contentSigning, this.deepfakeDetection)
            : TruthBundleService_js_1.truthBundleService;
        this.narrativeConflict = config.narrative
            ? new NarrativeConflictService_js_1.NarrativeConflictService(config.narrative)
            : NarrativeConflictService_js_1.narrativeConflictService;
        this.governance = config.governance
            ? new PIGGovernanceService_js_1.PIGGovernanceService(config.governance)
            : PIGGovernanceService_js_1.pigGovernanceService;
        // Wire up event propagation
        this.setupEventPropagation();
    }
    /**
     * Initialize all enabled services
     */
    async initialize() {
        if (this.initialized)
            return;
        logger.info('Initializing Provenance & Integrity Gateway');
        const services = this.getEnabledServices();
        const initPromises = [];
        if (services.c2paValidation) {
            // C2PAValidationService doesn't need async init
            logger.info('C2PA Validation service ready');
        }
        if (services.contentSigning) {
            initPromises.push(this.contentSigning.initialize());
        }
        if (services.deepfakeDetection) {
            initPromises.push(this.deepfakeDetection.initialize());
        }
        if (services.truthBundles) {
            initPromises.push(this.truthBundles.initialize());
        }
        if (services.narrativeConflict) {
            initPromises.push(this.narrativeConflict.initialize());
        }
        if (services.governance) {
            initPromises.push(this.governance.initialize());
        }
        await Promise.all(initPromises);
        this.initialized = true;
        logger.info('Provenance & Integrity Gateway initialized');
    }
    // ===========================================================================
    // Inbound Verification
    // ===========================================================================
    /**
     * Verify incoming content for provenance and authenticity
     *
     * This is the primary entry point for inbound media verification.
     * It validates C2PA credentials, checks for tampering, and optionally
     * runs deepfake detection.
     */
    async verifyContent(request, tenantId, options) {
        await this.ensureInitialized();
        logger.info({
            filename: request.filename,
            mimeType: request.mimeType,
            tenantId,
        }, 'Verifying content');
        // Run C2PA validation
        const result = await this.c2paValidation.validateContent(request, tenantId);
        // Optionally run deepfake detection
        if (options?.runDeepfakeDetection !== false) {
            const content = await this.getContentBuffer(request.content);
            const deepfakeResult = await this.deepfakeDetection.detectDeepfake(content, request.mimeType, request.filename, tenantId);
            result.deepfakeResult = deepfakeResult;
            if (deepfakeResult.isDeepfake) {
                result.status = 'suspicious';
                result.riskScore = Math.max(result.riskScore, deepfakeResult.confidence * 100);
                result.messages.push({
                    type: 'warning',
                    code: 'DEEPFAKE_DETECTED',
                    message: `Potential deepfake detected with ${Math.round(deepfakeResult.confidence * 100)}% confidence`,
                });
            }
        }
        // Optionally check against official assets
        if (options?.checkOfficialAssets !== false) {
            const content = await this.getContentBuffer(request.content);
            const match = await this.deepfakeDetection.matchOfficialAsset(content, request.mimeType, tenantId);
            result.officialAssetMatch = match;
            if (match.matched) {
                if (match.matchType === 'exact' && match.officialAssetValid) {
                    result.status = 'official_match';
                    result.riskScore = Math.min(result.riskScore, 10);
                    result.messages.push({
                        type: 'info',
                        code: 'OFFICIAL_ASSET_MATCH',
                        message: 'Content matches official organization asset',
                    });
                }
                else if (match.matchType !== 'exact') {
                    result.status = 'official_mismatch';
                    result.riskScore = Math.max(result.riskScore, 70);
                    result.messages.push({
                        type: 'warning',
                        code: 'OFFICIAL_ASSET_MODIFIED',
                        message: 'Content is a modified version of official organization asset',
                    });
                }
            }
        }
        return result;
    }
    // ===========================================================================
    // Outbound Signing
    // ===========================================================================
    /**
     * Sign official content for publication
     *
     * Creates a cryptographically signed asset with C2PA manifest
     * for official statements, press releases, executive videos, etc.
     */
    async signAsset(request, tenantId, userId) {
        await this.ensureInitialized();
        // Get governance config for approval workflow
        const config = await this.governance.getConfig(tenantId);
        // Enforce signing requirements if configured
        if (config.requireOutboundSigning) {
            if (!config.requiredSigningTypes.includes(request.assetType)) {
                logger.warn({
                    assetType: request.assetType,
                    requiredTypes: config.requiredSigningTypes,
                }, 'Asset type not in required signing types');
            }
        }
        return this.contentSigning.signAsset(request, tenantId, userId);
    }
    /**
     * Revoke a signed asset
     */
    async revokeAsset(request, tenantId, userId) {
        await this.ensureInitialized();
        const config = await this.governance.getConfig(tenantId);
        // Enforce revocation policy
        if (config.revocationPolicy?.requireExplanation && !request.explanation) {
            throw new Error('Explanation is required for asset revocation per governance policy');
        }
        // Default to auto-propagate based on config
        if (request.propagateRevocation === undefined) {
            request.propagateRevocation = config.revocationPolicy?.autoPropagateRevocations;
        }
        return this.contentSigning.revokeAsset(request, tenantId, userId);
    }
    /**
     * Get a signed asset by ID
     */
    async getAsset(assetId, tenantId) {
        await this.ensureInitialized();
        return this.contentSigning.getAsset(assetId, tenantId);
    }
    /**
     * Verify an existing asset's integrity
     */
    async verifyAsset(assetId, tenantId) {
        await this.ensureInitialized();
        return this.contentSigning.verifyAsset(assetId, tenantId);
    }
    // ===========================================================================
    // Impersonation & Deepfake Response
    // ===========================================================================
    /**
     * Analyze content for impersonation
     */
    async detectImpersonation(content, filename, mimeType, tenantId, options) {
        await this.ensureInitialized();
        return this.deepfakeDetection.detectImpersonation({
            content,
            filename,
            mimeType,
            targetEntity: options?.targetEntity,
            targetPersons: options?.targetPersons,
        }, tenantId);
    }
    /**
     * Generate a truth bundle for incident response
     */
    async generateTruthBundle(request, tenantId, userId) {
        await this.ensureInitialized();
        return this.truthBundles.generateTruthBundle(request, tenantId, userId);
    }
    /**
     * Get a truth bundle by ID
     */
    async getTruthBundle(bundleId, tenantId) {
        await this.ensureInitialized();
        return this.truthBundles.getBundle(bundleId, tenantId);
    }
    /**
     * Publish a truth bundle
     */
    async publishTruthBundle(bundleId, tenantId, userId) {
        await this.ensureInitialized();
        return this.truthBundles.publishBundle(bundleId, tenantId, userId);
    }
    /**
     * Export truth bundle in various formats
     */
    async exportTruthBundle(bundleId, tenantId, format) {
        await this.ensureInitialized();
        return this.truthBundles.exportBundle(bundleId, tenantId, format);
    }
    // ===========================================================================
    // Narrative Monitoring
    // ===========================================================================
    /**
     * Get or create a narrative cluster
     */
    async trackNarrative(tenantId, theme, keywords) {
        await this.ensureInitialized();
        return this.narrativeConflict.getOrCreateCluster(tenantId, theme, keywords);
    }
    /**
     * Add content to a narrative cluster
     */
    async addNarrativeContent(clusterId, tenantId, content) {
        await this.ensureInitialized();
        return this.narrativeConflict.addContentToCluster(clusterId, tenantId, {
            ...content,
            timestamp: new Date(),
            engagement: content.engagement || {},
        });
    }
    /**
     * Get narrative dashboard summary
     */
    async getNarrativeDashboard(tenantId) {
        await this.ensureInitialized();
        return this.narrativeConflict.getDashboardSummary(tenantId);
    }
    /**
     * List narrative clusters
     */
    async listNarrativeClusters(tenantId, options) {
        await this.ensureInitialized();
        return this.narrativeConflict.listClusters(tenantId, options);
    }
    // ===========================================================================
    // Governance
    // ===========================================================================
    /**
     * Get governance configuration for a tenant
     */
    async getGovernanceConfig(tenantId) {
        await this.ensureInitialized();
        return this.governance.getConfig(tenantId);
    }
    /**
     * Update governance configuration
     */
    async updateGovernanceConfig(tenantId, updates, userId) {
        await this.ensureInitialized();
        return this.governance.updateConfig(tenantId, updates, userId);
    }
    /**
     * Get risk assessment for a tenant
     */
    async getRiskAssessment(tenantId) {
        await this.ensureInitialized();
        return this.governance.getRiskAssessment(tenantId);
    }
    /**
     * Get NIST AI RMF compliance status
     */
    async getNISTCompliance(tenantId) {
        await this.ensureInitialized();
        return this.governance.getNISTCompliance(tenantId);
    }
    /**
     * Get EU DSA compliance status
     */
    async getDSACompliance(tenantId) {
        await this.ensureInitialized();
        return this.governance.getDSACompliance(tenantId);
    }
    /**
     * Generate compliance report
     */
    async generateComplianceReport(tenantId, options) {
        await this.ensureInitialized();
        return this.governance.generateComplianceReport(tenantId, options);
    }
    // ===========================================================================
    // Helper Methods
    // ===========================================================================
    /**
     * Get enabled services based on config
     */
    getEnabledServices() {
        if (this.config.enableAll) {
            return {
                c2paValidation: true,
                contentSigning: true,
                deepfakeDetection: true,
                truthBundles: true,
                narrativeConflict: true,
                governance: true,
            };
        }
        return this.config.enabledServices || {};
    }
    /**
     * Setup event propagation from services
     */
    setupEventPropagation() {
        // Forward all events from child services
        const forwardEvent = (serviceName) => (event) => (data) => {
            this.emit(event, { ...data, source: serviceName });
        };
        // Content signing events
        this.contentSigning.on('asset:signed', forwardEvent('signing')('asset:signed'));
        this.contentSigning.on('asset:revoked', forwardEvent('signing')('asset:revoked'));
        this.contentSigning.on('asset:published', forwardEvent('signing')('asset:published'));
        // C2PA events
        this.c2paValidation.on('content:verified', forwardEvent('c2pa')('content:verified'));
        // Deepfake events
        this.deepfakeDetection.on('deepfake:detected', forwardEvent('deepfake')('deepfake:detected'));
        this.deepfakeDetection.on('impersonation:detected', forwardEvent('deepfake')('impersonation:detected'));
        // Truth bundle events
        this.truthBundles.on('truthbundle:generated', forwardEvent('truthbundle')('truthbundle:generated'));
        // Narrative events
        this.narrativeConflict.on('narrative:detected', forwardEvent('narrative')('narrative:detected'));
        this.narrativeConflict.on('narrative:escalated', forwardEvent('narrative')('narrative:escalated'));
        // Governance events
        this.governance.on('config:updated', forwardEvent('governance')('config:updated'));
        this.governance.on('approval:submitted', forwardEvent('governance')('approval:submitted'));
        this.governance.on('approval:approved', forwardEvent('governance')('approval:approved'));
        this.governance.on('approval:rejected', forwardEvent('governance')('approval:rejected'));
    }
    /**
     * Get content as buffer
     */
    async getContentBuffer(content) {
        if (Buffer.isBuffer(content)) {
            return content;
        }
        const { promises: fs } = await Promise.resolve().then(() => __importStar(require('fs')));
        return fs.readFile(content);
    }
    /**
     * Ensure gateway is initialized
     */
    async ensureInitialized() {
        if (!this.initialized) {
            await this.initialize();
        }
    }
    /**
     * Cleanup all services
     */
    async cleanup() {
        await Promise.all([
            this.c2paValidation.cleanup(),
            this.contentSigning.cleanup(),
            this.deepfakeDetection.cleanup(),
            this.truthBundles.cleanup(),
            this.narrativeConflict.cleanup(),
        ]);
    }
}
exports.ProvenanceIntegrityGateway = ProvenanceIntegrityGateway;
// =============================================================================
// Factory Function
// =============================================================================
/**
 * Create a configured PIG instance
 */
function createPIGInstance(config) {
    return new ProvenanceIntegrityGateway(config);
}
// Export default instance
exports.pig = new ProvenanceIntegrityGateway();
