/**
 * Explainable Defense AI Module
 *
 * Provides transparent, auditable AI for mission-critical defense decisions
 * with complete explainability from data ingest to actionable intelligence.
 */

export {
  ExplainableDefenseAI,
  type DataSource,
  type EvidenceItem,
  type ReasoningStep,
  type FeatureContribution,
  type DecisionExplanation,
  type AlternativeOutcome,
  type UncertaintyFactor,
  type ChainOfTrustNode,
  type Attestation,
  type IntelligenceProduct,
  type AuditRecord,
} from './ExplainableDefenseAI.js';

export { ExplainableDefenseAIResolvers } from './resolvers.js';

import { ExplainableDefenseAI } from './ExplainableDefenseAI.js';

// Singleton instance for service integration
let instance: ExplainableDefenseAI | null = null;

export function getExplainableDefenseAI(): ExplainableDefenseAI {
  if (!instance) {
    instance = new ExplainableDefenseAI('explainable-defense-ai-primary');
  }
  return instance;
}

export function resetInstance(): void {
  instance = null;
}
