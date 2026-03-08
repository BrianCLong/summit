/**
 * AI Governance LLM Module
 *
 * Exports LLM client and utilities for AI-assisted governance.
 *
 * @module ai/governance/llm
 * @version 4.0.0
 */

export {
  GovernanceLLMClient,
  GovernanceLLMError,
  getGovernanceLLMClient,
  createGovernanceLLMClient,
} from './GovernanceLLMClient.ts';

export type {
  GovernanceLLMRequest,
  GovernanceLLMResponse,
  GovernanceLLMConfig,
  GovernanceLLMTaskType,
  GovernanceLLMContext,
} from './GovernanceLLMClient.ts';
