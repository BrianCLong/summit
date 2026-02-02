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

import { EventEmitter } from 'events';
import pino from 'pino';
import { C2PAValidationService, c2paValidationService, type C2PAValidationServiceConfig } from './C2PAValidationService.js';
import { ContentSigningService, contentSigningService, type ContentSigningServiceConfig } from './ContentSigningService.js';
import { DeepfakeDetectionService, deepfakeDetectionService, type DeepfakeDetectionConfig } from './DeepfakeDetectionService.js';
import { TruthBundleService, truthBundleService, type TruthBundleServiceConfig } from './TruthBundleService.js';
import { NarrativeConflictService, narrativeConflictService, type NarrativeConflictConfig } from './NarrativeConflictService.js';
import { PIGGovernanceService, pigGovernanceService, type PIGGovernanceServiceConfig } from './PIGGovernanceService.js';
import type {
  ContentVerificationRequest,
  ContentVerificationResult,
  SignAssetRequest,
  SignAssetResponse,
  RevokeAssetRequest,
  RevokeAssetResponse,
  GenerateTruthBundleRequest,
  GenerateTruthBundleResponse,
  SignedAsset,
  TruthBundle,
  NarrativeCluster,
  PIGGovernanceConfig,
  PIGEvents,
} from './types.js';

const logger = (pino as any)({ name: 'ProvenanceIntegrityGateway' });

// =============================================================================
// Configuration
// =============================================================================

export interface PIGConfig {
  /** C2PA validation service configuration */
  c2pa?: Partial<C2PAValidationServiceConfig>;

  /** Content signing service configuration */
  signing?: Partial<ContentSigningServiceConfig>;

  /** Deepfake detection service configuration */
  deepfake?: Partial<DeepfakeDetectionConfig>;

  /** Truth bundle service configuration */
  truthBundle?: Partial<TruthBundleServiceConfig>;

  /** Narrative conflict service configuration */
  narrative?: Partial<NarrativeConflictConfig>;

  /** Governance service configuration */
  governance?: Partial<PIGGovernanceServiceConfig>;

  /** Enable all services by default */
  enableAll?: boolean;

  /** Specific services to enable */
  enabledServices?: {
    c2paValidation?: boolean;
    contentSigning?: boolean;
    deepfakeDetection?: boolean;
    truthBundles?: boolean;
    narrativeConflict?: boolean;
    governance?: boolean;
  };
}

const defaultConfig: PIGConfig = {
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

export class ProvenanceIntegrityGateway extends EventEmitter {
  private config: PIGConfig;

  // Services
  public readonly c2paValidation: C2PAValidationService;
  public readonly contentSigning: ContentSigningService;
  public readonly deepfakeDetection: DeepfakeDetectionService;
  public readonly truthBundles: TruthBundleService;
  public readonly narrativeConflict: NarrativeConflictService;
  public readonly governance: PIGGovernanceService;

  private initialized = false;

  constructor(config: PIGConfig = {}) {
    super();
    this.config = { ...defaultConfig, ...config };

    // Initialize services with provided config
    this.c2paValidation = config.c2pa
      ? new C2PAValidationService(config.c2pa)
      : c2paValidationService;

    this.contentSigning = config.signing
      ? new ContentSigningService(config.signing)
      : contentSigningService;

    this.deepfakeDetection = config.deepfake
      ? new DeepfakeDetectionService(config.deepfake)
      : deepfakeDetectionService;

    this.truthBundles = config.truthBundle
      ? new TruthBundleService(config.truthBundle, this.contentSigning, this.deepfakeDetection)
      : truthBundleService;

    this.narrativeConflict = config.narrative
      ? new NarrativeConflictService(config.narrative)
      : narrativeConflictService;

    this.governance = config.governance
      ? new PIGGovernanceService(config.governance)
      : pigGovernanceService;

    // Wire up event propagation
    this.setupEventPropagation();
  }

  /**
   * Initialize all enabled services
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    logger.info('Initializing Provenance & Integrity Gateway');

    const services = this.getEnabledServices();
    const initPromises: Promise<void>[] = [];

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
  async verifyContent(
    request: ContentVerificationRequest,
    tenantId: string,
    options?: {
      runDeepfakeDetection?: boolean;
      checkOfficialAssets?: boolean;
    }
  ): Promise<ContentVerificationResult> {
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
      const deepfakeResult = await this.deepfakeDetection.detectDeepfake(
        content,
        request.mimeType,
        request.filename,
        tenantId
      );

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
      const match = await this.deepfakeDetection.matchOfficialAsset(
        content,
        request.mimeType,
        tenantId
      );

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
        } else if (match.matchType !== 'exact') {
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
  async signAsset(
    request: SignAssetRequest,
    tenantId: string,
    userId: string
  ): Promise<SignAssetResponse> {
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
  async revokeAsset(
    request: RevokeAssetRequest,
    tenantId: string,
    userId: string
  ): Promise<RevokeAssetResponse> {
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
  async getAsset(assetId: string, tenantId: string): Promise<SignedAsset | null> {
    await this.ensureInitialized();
    return this.contentSigning.getAsset(assetId, tenantId);
  }

  /**
   * Verify an existing asset's integrity
   */
  async verifyAsset(assetId: string, tenantId: string): Promise<{
    valid: boolean;
    errors: string[];
    asset?: SignedAsset;
  }> {
    await this.ensureInitialized();
    return this.contentSigning.verifyAsset(assetId, tenantId);
  }

  // ===========================================================================
  // Impersonation & Deepfake Response
  // ===========================================================================

  /**
   * Analyze content for impersonation
   */
  async detectImpersonation(
    content: Buffer,
    filename: string,
    mimeType: string,
    tenantId: string,
    options?: {
      targetEntity?: string;
      targetPersons?: string[];
    }
  ) {
    await this.ensureInitialized();

    return this.deepfakeDetection.detectImpersonation(
      {
        content,
        filename,
        mimeType,
        targetEntity: options?.targetEntity,
        targetPersons: options?.targetPersons,
      },
      tenantId
    );
  }

  /**
   * Generate a truth bundle for incident response
   */
  async generateTruthBundle(
    request: GenerateTruthBundleRequest,
    tenantId: string,
    userId: string
  ): Promise<GenerateTruthBundleResponse> {
    await this.ensureInitialized();

    return this.truthBundles.generateTruthBundle(request, tenantId, userId);
  }

  /**
   * Get a truth bundle by ID
   */
  async getTruthBundle(bundleId: string, tenantId: string): Promise<TruthBundle | null> {
    await this.ensureInitialized();
    return this.truthBundles.getBundle(bundleId, tenantId);
  }

  /**
   * Publish a truth bundle
   */
  async publishTruthBundle(
    bundleId: string,
    tenantId: string,
    userId: string
  ): Promise<TruthBundle> {
    await this.ensureInitialized();
    return this.truthBundles.publishBundle(bundleId, tenantId, userId);
  }

  /**
   * Export truth bundle in various formats
   */
  async exportTruthBundle(
    bundleId: string,
    tenantId: string,
    format: 'pdf' | 'json' | 'html'
  ): Promise<Buffer> {
    await this.ensureInitialized();
    return this.truthBundles.exportBundle(bundleId, tenantId, format);
  }

  // ===========================================================================
  // Narrative Monitoring
  // ===========================================================================

  /**
   * Get or create a narrative cluster
   */
  async trackNarrative(
    tenantId: string,
    theme: string,
    keywords: string[]
  ): Promise<NarrativeCluster> {
    await this.ensureInitialized();
    return this.narrativeConflict.getOrCreateCluster(tenantId, theme, keywords);
  }

  /**
   * Add content to a narrative cluster
   */
  async addNarrativeContent(
    clusterId: string,
    tenantId: string,
    content: {
      url: string;
      platform: string;
      snippet: string;
      author: string;
      engagement?: {
        likes?: number;
        shares?: number;
        comments?: number;
        views?: number;
      };
    }
  ): Promise<NarrativeCluster> {
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
  async getNarrativeDashboard(tenantId: string) {
    await this.ensureInitialized();
    return this.narrativeConflict.getDashboardSummary(tenantId);
  }

  /**
   * List narrative clusters
   */
  async listNarrativeClusters(
    tenantId: string,
    options?: {
      status?: NarrativeCluster['status'][];
      minRiskScore?: number;
      limit?: number;
    }
  ) {
    await this.ensureInitialized();
    return this.narrativeConflict.listClusters(tenantId, options);
  }

  // ===========================================================================
  // Governance
  // ===========================================================================

  /**
   * Get governance configuration for a tenant
   */
  async getGovernanceConfig(tenantId: string): Promise<PIGGovernanceConfig> {
    await this.ensureInitialized();
    return this.governance.getConfig(tenantId);
  }

  /**
   * Update governance configuration
   */
  async updateGovernanceConfig(
    tenantId: string,
    updates: Partial<PIGGovernanceConfig>,
    userId: string
  ): Promise<PIGGovernanceConfig> {
    await this.ensureInitialized();
    return this.governance.updateConfig(tenantId, updates, userId);
  }

  /**
   * Get risk assessment for a tenant
   */
  async getRiskAssessment(tenantId: string) {
    await this.ensureInitialized();
    return this.governance.getRiskAssessment(tenantId);
  }

  /**
   * Get NIST AI RMF compliance status
   */
  async getNISTCompliance(tenantId: string) {
    await this.ensureInitialized();
    return this.governance.getNISTCompliance(tenantId);
  }

  /**
   * Get EU DSA compliance status
   */
  async getDSACompliance(tenantId: string) {
    await this.ensureInitialized();
    return this.governance.getDSACompliance(tenantId);
  }

  /**
   * Generate compliance report
   */
  async generateComplianceReport(
    tenantId: string,
    options?: {
      frameworks?: ('nist' | 'dsa')[];
      includeRiskRegister?: boolean;
      includeAuditLog?: boolean;
      format?: 'json' | 'pdf' | 'html';
    }
  ) {
    await this.ensureInitialized();
    return this.governance.generateComplianceReport(tenantId, options);
  }

  // ===========================================================================
  // Helper Methods
  // ===========================================================================

  /**
   * Get enabled services based on config
   */
  private getEnabledServices() {
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
  private setupEventPropagation(): void {
    // Forward all events from child services
    const forwardEvent = (serviceName: string) => (event: string) => (data: any) => {
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
  private async getContentBuffer(content: string | Buffer): Promise<Buffer> {
    if (Buffer.isBuffer(content)) {
      return content;
    }
    const { promises: fs } = await import('fs');
    return fs.readFile(content);
  }

  /**
   * Ensure gateway is initialized
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  /**
   * Cleanup all services
   */
  async cleanup(): Promise<void> {
    await Promise.all([
      this.c2paValidation.cleanup(),
      this.contentSigning.cleanup(),
      this.deepfakeDetection.cleanup(),
      this.truthBundles.cleanup(),
      this.narrativeConflict.cleanup(),
    ]);
  }
}

// =============================================================================
// Factory Function
// =============================================================================

/**
 * Create a configured PIG instance
 */
export function createPIGInstance(config?: PIGConfig): ProvenanceIntegrityGateway {
  return new ProvenanceIntegrityGateway(config);
}

// Export default instance
export const pig = new ProvenanceIntegrityGateway();
