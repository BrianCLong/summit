/**
 * AI-Assisted Governance Module
 *
 * Provides AI-augmented governance features including policy suggestions,
 * verdict explanations, and behavioral anomaly detection.
 *
 * @module ai/governance
 * @version 4.0.0-alpha
 */

// Types
export * from './types.js';

// Services
export {
  PolicySuggestionService,
  createPolicySuggestionService,
} from './PolicySuggestionService.js';

export {
  VerdictExplainerService,
  createVerdictExplainerService,
} from './VerdictExplainerService.js';

export {
  BehavioralAnomalyService,
  createBehavioralAnomalyService,
} from './BehavioralAnomalyService.js';

// Unified AI Governance Service
import { PolicySuggestionService, createPolicySuggestionService } from './PolicySuggestionService.js';
import { VerdictExplainerService, createVerdictExplainerService } from './VerdictExplainerService.js';
import { BehavioralAnomalyService, createBehavioralAnomalyService } from './BehavioralAnomalyService.js';
import { AIGovernanceConfig } from './types.js';

/**
 * Unified AI Governance Service
 *
 * Provides a single interface to all AI governance capabilities.
 */
export class AIGovernanceService {
  public readonly policySuggestions: PolicySuggestionService;
  public readonly verdictExplainer: VerdictExplainerService;
  public readonly anomalyDetection: BehavioralAnomalyService;

  constructor(config: Partial<AIGovernanceConfig> = {}) {
    this.policySuggestions = createPolicySuggestionService(config);
    this.verdictExplainer = createVerdictExplainerService(config);
    this.anomalyDetection = createBehavioralAnomalyService(config);
  }
}

/**
 * Create a new AI Governance Service instance
 */
export function createAIGovernanceService(
  config: Partial<AIGovernanceConfig> = {}
): AIGovernanceService {
  return new AIGovernanceService(config);
}

// Default singleton instance
let defaultInstance: AIGovernanceService | null = null;

/**
 * Get the default AI Governance Service instance
 */
export function getAIGovernanceService(): AIGovernanceService {
  if (!defaultInstance) {
    defaultInstance = createAIGovernanceService();
  }
  return defaultInstance;
}

export default AIGovernanceService;
