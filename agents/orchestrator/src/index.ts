/**
 * Multi-LLM Orchestrator
 *
 * Resilient multi-LLM chaining (Claude/GPT/o1) with governance gates
 * for Summit agents, including hallucination scoring and fallback routing.
 *
 * @packageDocumentation
 */

// Main orchestrator
export {
  MultiLLMOrchestrator,
  MultiLLMOrchestratorConfig,
  OrchestratorError,
  GovernanceError,
  BudgetError,
} from './MultiLLMOrchestrator.js';

// Types
export * from './types/index.js';

// Providers
export {
  BaseLLMProvider,
  ClaudeProvider,
  ClaudeProviderConfig,
  OpenAIProvider,
  OpenAIProviderConfig,
  ProviderRegistry,
  ProviderFactory,
  MODEL_CAPABILITIES,
} from './providers/index.js';

// Routing
export {
  CircuitBreaker,
  CircuitBreakerRegistry,
  FallbackRouter,
  RoutingConfig,
  RoutingDecision,
  RoutingResult,
} from './routing/index.js';

// State
export {
  RedisStateManager,
  RedisStateConfig,
} from './state/index.js';

// Governance
export {
  GovernanceEngine,
  GovernanceResult,
} from './governance/index.js';

// Scoring
export {
  HallucinationScorer,
  HallucinationScorerDeps,
} from './scoring/index.js';

// Convenience factory function
export function createOrchestrator(
  config?: import('./MultiLLMOrchestrator.js').MultiLLMOrchestratorConfig,
): import('./MultiLLMOrchestrator.js').MultiLLMOrchestrator {
  const { MultiLLMOrchestrator } = require('./MultiLLMOrchestrator.js');
  return new MultiLLMOrchestrator(config);
}
