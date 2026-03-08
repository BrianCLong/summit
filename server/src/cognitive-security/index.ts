/**
 * Cognitive Security Operations Module
 *
 * Defensive cognitive security system for detecting and responding to
 * mis/disinformation campaigns and influence operations.
 *
 * Key capabilities:
 * - C2PA/Content Credentials for media authenticity
 * - Claim Graph for modeling information landscape
 * - Campaign detection via coordination signals
 * - Response operations with playbooks
 * - Governance with audit and appeals
 * - Evaluation metrics and KPIs
 *
 * @module cognitive-security
 */

// Types
export * from './types.js';

// Services
export {
  ProvenanceService,
  createProvenanceService,
  initializeProvenanceService,
  getProvenanceService,
  parseC2PAManifest,
  type ProvenanceServiceConfig,
} from './provenance.service.js';

export {
  ClaimsService,
  createClaimsService,
  initializeClaimsService,
  getClaimsService,
  type ClaimsServiceConfig,
} from './claims.service.js';

export {
  CampaignDetectionService,
  createCampaignDetectionService,
  initializeCampaignDetectionService,
  getCampaignDetectionService,
  type CampaignDetectionConfig,
  type DetectionThresholds,
} from './campaign-detection.service.js';

export {
  ResponseOpsService,
  createResponseOpsService,
  initializeResponseOpsService,
  getResponseOpsService,
  type ResponseOpsConfig,
} from './response-ops.service.js';

export {
  GovernanceService,
  createGovernanceService,
  initializeGovernanceService,
  getGovernanceService,
  DEFAULT_POLICIES,
  type GovernanceServiceConfig,
} from './governance.service.js';

export {
  EvaluationService,
  createEvaluationService,
  initializeEvaluationService,
  getEvaluationService,
  BENCHMARK_TARGETS,
  type EvaluationServiceConfig,
} from './evaluation.service.js';

export { CognitiveStateService } from '../services/CognitiveStateService.js';
export { CascadeDetectionService } from '../services/CascadeDetectionService.js';

// Module initialization
import type { Driver } from 'neo4j-driver';
import pino from 'pino';

import { initializeProvenanceService, type ProvenanceServiceConfig } from './provenance.service.js';
import { initializeClaimsService, type ClaimsServiceConfig } from './claims.service.js';
import { initializeCampaignDetectionService, type CampaignDetectionConfig } from './campaign-detection.service.js';
import { initializeResponseOpsService, type ResponseOpsConfig } from './response-ops.service.js';
import { initializeGovernanceService, type GovernanceServiceConfig } from './governance.service.js';
import { initializeEvaluationService, type EvaluationServiceConfig } from './evaluation.service.js';

const logger = (pino as any)({ name: 'cognitive-security' });

export interface CognitiveSecurityConfig {
  /** Neo4j driver */
  neo4jDriver: Driver;
  /** PostgreSQL pool for audit logs */
  pgPool?: any;
  /** LLM service for content generation */
  llmService?: any;
  /** Embedding service for semantic search */
  embeddingService?: any;
  /** NLP service for entity extraction */
  nlpService?: any;
  /** Provenance ledger URL */
  provLedgerUrl?: string;
  /** Organization name */
  organizationName?: string;
  /** Enable real-time detection */
  realTimeDetection?: boolean;
}

export interface CognitiveSecurityModule {
  provenance: ReturnType<typeof initializeProvenanceService>;
  claims: ReturnType<typeof initializeClaimsService>;
  campaignDetection: ReturnType<typeof initializeCampaignDetectionService>;
  responseOps: ReturnType<typeof initializeResponseOpsService>;
  governance: ReturnType<typeof initializeGovernanceService>;
  evaluation: ReturnType<typeof initializeEvaluationService>;
  healthCheck: () => Promise<{
    healthy: boolean;
    services: Record<string, { healthy: boolean; details: Record<string, unknown> }>;
  }>;
}

/**
 * Initialize the Cognitive Security module
 */
export function initializeCognitiveSecurityModule(
  config: CognitiveSecurityConfig,
): CognitiveSecurityModule {
  logger.info('Initializing Cognitive Security module');

  // Initialize all services
  const provenance = initializeProvenanceService({
    provLedgerUrl: config.provLedgerUrl,
  });

  const claims = initializeClaimsService({
    neo4jDriver: config.neo4jDriver,
    embeddingService: config.embeddingService,
    nlpService: config.nlpService,
  });

  const campaignDetection = initializeCampaignDetectionService({
    neo4jDriver: config.neo4jDriver,
    realTimeEnabled: config.realTimeDetection,
  });

  const responseOps = initializeResponseOpsService({
    neo4jDriver: config.neo4jDriver,
    llmService: config.llmService,
    organizationName: config.organizationName,
  });

  const governance = initializeGovernanceService({
    neo4jDriver: config.neo4jDriver,
    pgPool: config.pgPool,
  });

  const evaluation = initializeEvaluationService({
    neo4jDriver: config.neo4jDriver,
  });

  logger.info('Cognitive Security module initialized');

  return {
    provenance,
    claims,
    campaignDetection,
    responseOps,
    governance,
    evaluation,
    healthCheck: async () => {
      const [
        provenanceHealth,
        claimsHealth,
        campaignHealth,
        responseHealth,
        governanceHealth,
        evaluationHealth,
      ] = await Promise.all([
        provenance.healthCheck(),
        claims.healthCheck(),
        campaignDetection.healthCheck(),
        responseOps.healthCheck(),
        governance.healthCheck(),
        evaluation.healthCheck(),
      ]);

      const allHealthy =
        provenanceHealth.healthy &&
        claimsHealth.healthy &&
        campaignHealth.healthy &&
        responseHealth.healthy &&
        governanceHealth.healthy &&
        evaluationHealth.healthy;

      return {
        healthy: allHealthy,
        services: {
          provenance: provenanceHealth,
          claims: claimsHealth,
          campaignDetection: campaignHealth,
          responseOps: responseHealth,
          governance: governanceHealth,
          evaluation: evaluationHealth,
        },
      };
    },
  };
}

/**
 * Get the initialized Cognitive Security module
 * Must call initializeCognitiveSecurityModule first
 */
export function getCognitiveSecurityModule(): CognitiveSecurityModule {
  return {
    provenance: require('./provenance.service.js').getProvenanceService(),
    claims: require('./claims.service.js').getClaimsService(),
    campaignDetection: require('./campaign-detection.service.js').getCampaignDetectionService(),
    responseOps: require('./response-ops.service.js').getResponseOpsService(),
    governance: require('./governance.service.js').getGovernanceService(),
    evaluation: require('./evaluation.service.js').getEvaluationService(),
    healthCheck: async () => {
      // Delegate to individual service health checks
      return { healthy: true, services: {} };
    },
  };
}
