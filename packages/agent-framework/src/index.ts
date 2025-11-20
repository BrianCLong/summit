/**
 * Agent Framework - Core exports
 */

// Types
export * from './types/agent.types.js';

// Base Agent
export { BaseAgent } from './agents/BaseAgent.js';

// Communication
export { MessageBus } from './communication/MessageBus.js';
export type { MessageBusConfig } from './communication/MessageBus.js';

// Registry
export { AgentRegistry } from './registry/AgentRegistry.js';
export type { AgentRegistration } from './registry/AgentRegistry.js';

// LLM Integration
export {
  LLMProvider,
  AnthropicProvider,
  OpenAIProvider,
  LLMProviderFactory,
  LLMAgentCapability,
} from './llm/LLMProvider.js';
export type {
  LLMMessage,
  LLMTool,
  LLMOptions,
  LLMResponse,
  LLMProviderConfig,
} from './llm/LLMProvider.js';
