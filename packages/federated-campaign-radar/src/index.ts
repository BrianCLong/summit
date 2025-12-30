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

// Core Types
export * from './core/types';

// Signal Normalization
export { SignalNormalizer } from './core/SignalNormalizer';

// Federation Service
export {
  FederationService,
  type FederationConfig,
} from './federation/FederationService';

// Clustering Engine
export {
  ClusteringEngine,
  type ClusteringConfig,
} from './clustering/ClusteringEngine';

// Alert Engine
export {
  AlertEngine,
  type AlertConfig,
  type AlertThreshold,
} from './alerts/AlertEngine';

// Audit Service
export {
  AuditService,
  type AuditConfig,
  type GovernanceControl,
} from './audit/AuditService';

// GraphQL
export { schema } from './graphql/schema';
export {
  resolvers,
  pubsub,
  EVENTS,
  type ResolverContext,
} from './graphql/resolvers';

// Version
export const VERSION = '1.0.0';

// Default configuration factory
export interface FederatedCampaignRadarConfig {
  participantId: string;
  organizationId: string;
  privacyLevel: 'strict' | 'balanced' | 'permissive';
  enableC2PA: boolean;
  enableAudit: boolean;
  federation?: Partial<import('./federation/FederationService').FederationConfig>;
  clustering?: Partial<import('./clustering/ClusteringEngine').ClusteringConfig>;
  alerts?: Partial<import('./alerts/AlertEngine').AlertConfig>;
  audit?: Partial<import('./audit/AuditService').AuditConfig>;
}

/**
 * Create a fully configured Federated Campaign Radar instance
 */
export function createFederatedCampaignRadar(config: FederatedCampaignRadarConfig) {
  const {
    participantId,
    organizationId,
    privacyLevel,
    enableC2PA,
    enableAudit,
  } = config;

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
  const clusteringEngine = new ClusteringEngine(
    federationService,
    {
      similarityThreshold: 0.75,
      minClusterSize: 3,
      crossTenantBoostFactor: 1.5,
      ...config.clustering,
    },
  );

  // Initialize Alert Engine
  const alertEngine = new AlertEngine(
    clusteringEngine,
    federationService,
    {
      defaultCooldownMs: 3600000, // 1 hour
      maxActiveAlerts: 100,
      enableAutoEscalation: true,
      ...config.alerts,
    },
  );

  // Initialize Audit Service (optional)
  let auditService: AuditService | undefined;
  if (enableAudit) {
    auditService = new AuditService({
      organizationId,
      retentionDays: 365,
      enableIntegrityChecks: true,
      ...config.audit,
    });

    // Wire up audit logging
    signalNormalizer.on?.('signal:normalized', (signal) => {
      auditService!.logEvent({
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
  const createResolverContext = (): import('./graphql/resolvers').ResolverContext => ({
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
    async submitSignal(input: Parameters<typeof signalNormalizer.normalizeNarrative>[0]) {
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

    getActiveClusters(minThreatLevel?: import('./core/types').ThreatLevel) {
      return clusteringEngine.getActiveClusters(minThreatLevel);
    },
  };
}
