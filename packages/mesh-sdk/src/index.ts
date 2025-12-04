/**
 * Agentic Mesh SDK
 *
 * Core SDK for building agents, tools, and integrations with the Agentic Mesh.
 *
 * @packageDocumentation
 */

// Core types
export * from './types.js';

// Base agent class and factory
export { BaseAgent, AgentFactory } from './Agent.js';
export type {
  AgentServices,
  ProvenanceClient,
  ToolClient,
  ModelClient,
  MeshClient,
  MetricsClient,
  Logger,
  ModelCallOptions,
  ModelResponse,
  ChatMessage,
  SubtaskOptions,
} from './Agent.js';

// Built-in agents
export { PlannerAgent } from './agents/PlannerAgent.js';
export { CoderAgent } from './agents/CoderAgent.js';
export { CriticAgent } from './agents/CriticAgent.js';
export { ResearchAgent } from './agents/ResearchAgent.js';
export { PolicyGuardianAgent } from './agents/PolicyGuardianAgent.js';
export { ProvenanceAuditorAgent } from './agents/ProvenanceAuditorAgent.js';
