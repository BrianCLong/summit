/**
 * @fileoverview IntelGraph Strands Agents SDK Integration
 *
 * This package provides a comprehensive integration of the Strands Agents TypeScript SDK
 * with the IntelGraph intelligence analysis platform. It includes:
 *
 * - **Type-safe Graph Tools**: Neo4j operations with Zod validation
 * - **Pre-configured Agents**: Investigation, Entity Resolution, and Analyst agents
 * - **Graph-backed Memory**: Persistent, queryable agent memory
 * - **Streaming Support**: Real-time response streaming
 *
 * @example
 * ```typescript
 * import {
 *   createInvestigationAgent,
 *   createEntityResolutionAgent,
 *   createAnalystAgent,
 *   createGraphMemory,
 * } from '@intelgraph/strands-agents';
 * import neo4j from 'neo4j-driver';
 *
 * // Initialize Neo4j connection
 * const driver = neo4j.driver(
 *   'bolt://localhost:7687',
 *   neo4j.auth.basic('neo4j', 'password')
 * );
 *
 * // Create an investigation agent
 * const investigator = createInvestigationAgent({
 *   driver,
 *   modelProvider: 'bedrock',
 *   auditLog: (action, details) => console.log(`[AUDIT] ${action}`, details),
 * });
 *
 * // Run an investigation task
 * const result = await investigator.investigate({
 *   investigationId: 'inv-123',
 *   task: 'Identify key influencers and their communication patterns',
 * });
 *
 * // Create an analyst agent for ad-hoc questions
 * const analyst = createAnalystAgent({ driver });
 *
 * const analysis = await analyst.analyze({
 *   question: 'What patterns exist between these entities?',
 *   focusEntityIds: ['entity-1', 'entity-2'],
 *   depth: 'standard',
 * });
 *
 * // Use graph-backed memory for persistent context
 * const memory = createGraphMemory({
 *   driver,
 *   agentId: 'investigation-agent',
 * });
 *
 * await memory.remember({
 *   type: 'FACT',
 *   content: 'Entity A is connected to Entity B through Organization C',
 *   importance: 0.8,
 * });
 *
 * const context = await memory.getContext();
 * ```
 *
 * @module @intelgraph/strands-agents
 * @packageDocumentation
 */

// ============================================================================
// Types
// ============================================================================

export * from './types.js';

// ============================================================================
// Tools
// ============================================================================

export {
  createGraphTools,
  type GraphTools,
  type GraphToolsConfig,
  ExecuteCypherInputSchema,
  FindPathInputSchema,
  GetNeighborsInputSchema,
  SubgraphQueryInputSchema,
  GraphStatsInputSchema,
} from './tools/graph-tools.js';

export {
  createEntityTools,
  type EntityTools,
  type EntityToolsConfig,
  SearchEntitiesInputSchema,
  GetEntityInputSchema,
  CreateEntityInputSchema,
  FindSimilarEntitiesInputSchema,
  ResolveEntityInputSchema,
} from './tools/entity-tools.js';

export {
  createInvestigationTools,
  type InvestigationTools,
  type InvestigationToolsConfig,
  GetInvestigationInputSchema,
  CreateHypothesisInputSchema,
  UpdateHypothesisInputSchema,
  AddFindingInputSchema,
  LinkEntitiesToInvestigationInputSchema,
  GetTimelineInputSchema,
} from './tools/investigation-tools.js';

export {
  createAnalysisTools,
  type AnalysisTools,
  type AnalysisToolsConfig,
  DetectPatternsInputSchema,
  CentralityAnalysisInputSchema,
  AnomalyDetectionInputSchema,
  CompareEntitiesInputSchema,
} from './tools/analysis-tools.js';

// ============================================================================
// Agents
// ============================================================================

export {
  createInvestigationAgent,
  type InvestigationAgent,
  type InvestigationAgentConfig,
  type InvestigationTask,
  type InvestigationResult,
} from './agents/investigation-agent.js';

export {
  createEntityResolutionAgent,
  type EntityResolutionAgent,
  type EntityResolutionAgentConfig,
  type ResolutionCandidate,
  type ResolutionTask,
  type ResolutionResult,
} from './agents/entity-resolution-agent.js';

export {
  createAnalystAgent,
  type AnalystAgent,
  type AnalystAgentConfig,
  type AnalysisTask,
  type AnalysisResult,
} from './agents/analyst-agent.js';

export {
  INVESTIGATION_AGENT_PROMPT,
  ENTITY_RESOLUTION_AGENT_PROMPT,
  ANALYST_AGENT_PROMPT,
  NARRATIVE_AGENT_PROMPT,
  getSystemPrompt,
} from './agents/prompts.js';

// ============================================================================
// Memory
// ============================================================================

export {
  createGraphMemory,
  type GraphMemory,
  type GraphMemoryConfig,
  type MemorySearchOptions,
  type ConversationContext,
} from './memory/graph-memory.js';

// ============================================================================
// Governance
// ============================================================================

export {
  createGovernanceMiddleware,
  type GovernanceMiddleware,
  type GovernanceConfig,
  type ToolRiskProfile,
  type PolicyCheck,
  DEFAULT_TOOL_RISKS,
} from './governance/index.js';

// ============================================================================
// Convenience Factories
// ============================================================================

import type { Driver } from 'neo4j-driver';
import { createGraphTools } from './tools/graph-tools.js';
import { createEntityTools } from './tools/entity-tools.js';
import { createInvestigationTools } from './tools/investigation-tools.js';
import { createAnalysisTools } from './tools/analysis-tools.js';

/**
 * Configuration for creating all IntelGraph tools
 */
export interface IntelGraphToolsConfig {
  driver: Driver;
  database?: string;
  auditLog?: (action: string, details: Record<string, unknown>) => void;
  userId?: string;
}

/**
 * Creates all IntelGraph tools in one call
 *
 * @example
 * ```typescript
 * const { graphTools, entityTools, investigationTools, analysisTools, allTools } =
 *   createAllTools({ driver });
 *
 * // Use with Strands Agent
 * const agent = new Agent({
 *   systemPrompt: 'You are an intelligence analyst.',
 *   tools: allTools,
 * });
 * ```
 */
export function createAllTools(config: IntelGraphToolsConfig) {
  const graphTools = createGraphTools(config);
  const entityTools = createEntityTools(config);
  const investigationTools = createInvestigationTools(config);
  const analysisTools = createAnalysisTools(config);

  return {
    graphTools,
    entityTools,
    investigationTools,
    analysisTools,
    allTools: [
      ...graphTools.all,
      ...entityTools.all,
      ...investigationTools.all,
      ...analysisTools.all,
    ],
  };
}

/**
 * Tool categories for selective inclusion
 */
export const ToolCategories = {
  /** Graph traversal and query tools */
  GRAPH: ['execute_cypher', 'find_path', 'get_neighbors', 'get_subgraph', 'get_graph_stats'],
  /** Entity management tools */
  ENTITY: ['search_entities', 'get_entity', 'create_entity', 'find_similar_entities', 'resolve_entity'],
  /** Investigation workflow tools */
  INVESTIGATION: ['get_investigation', 'create_hypothesis', 'update_hypothesis', 'add_finding', 'link_entities_to_investigation', 'get_timeline'],
  /** Analysis and pattern detection tools */
  ANALYSIS: ['detect_patterns', 'analyze_centrality', 'detect_anomalies', 'compare_entities'],
  /** Read-only tools (safe for autonomous execution) */
  READ_ONLY: ['execute_cypher', 'find_path', 'get_neighbors', 'get_subgraph', 'get_graph_stats', 'search_entities', 'get_entity', 'find_similar_entities', 'get_investigation', 'get_timeline', 'detect_patterns', 'analyze_centrality', 'detect_anomalies', 'compare_entities'],
  /** Write tools (require approval in most configurations) */
  WRITE: ['create_entity', 'resolve_entity', 'create_hypothesis', 'update_hypothesis', 'add_finding', 'link_entities_to_investigation'],
} as const;
