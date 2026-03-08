"use strict";
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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ToolCategories = exports.DEFAULT_TOOL_RISKS = exports.createGovernanceMiddleware = exports.createGraphMemory = exports.getSystemPrompt = exports.NARRATIVE_AGENT_PROMPT = exports.ANALYST_AGENT_PROMPT = exports.ENTITY_RESOLUTION_AGENT_PROMPT = exports.INVESTIGATION_AGENT_PROMPT = exports.createAnalystAgent = exports.createEntityResolutionAgent = exports.createInvestigationAgent = exports.CompareEntitiesInputSchema = exports.AnomalyDetectionInputSchema = exports.CentralityAnalysisInputSchema = exports.DetectPatternsInputSchema = exports.createAnalysisTools = exports.GetTimelineInputSchema = exports.LinkEntitiesToInvestigationInputSchema = exports.AddFindingInputSchema = exports.UpdateHypothesisInputSchema = exports.CreateHypothesisInputSchema = exports.GetInvestigationInputSchema = exports.createInvestigationTools = exports.ResolveEntityInputSchema = exports.FindSimilarEntitiesInputSchema = exports.CreateEntityInputSchema = exports.GetEntityInputSchema = exports.SearchEntitiesInputSchema = exports.createEntityTools = exports.GraphStatsInputSchema = exports.SubgraphQueryInputSchema = exports.GetNeighborsInputSchema = exports.FindPathInputSchema = exports.ExecuteCypherInputSchema = exports.createGraphTools = void 0;
exports.createAllTools = createAllTools;
// ============================================================================
// Types
// ============================================================================
__exportStar(require("./types.js"), exports);
// ============================================================================
// Tools
// ============================================================================
var graph_tools_js_1 = require("./tools/graph-tools.js");
Object.defineProperty(exports, "createGraphTools", { enumerable: true, get: function () { return graph_tools_js_1.createGraphTools; } });
Object.defineProperty(exports, "ExecuteCypherInputSchema", { enumerable: true, get: function () { return graph_tools_js_1.ExecuteCypherInputSchema; } });
Object.defineProperty(exports, "FindPathInputSchema", { enumerable: true, get: function () { return graph_tools_js_1.FindPathInputSchema; } });
Object.defineProperty(exports, "GetNeighborsInputSchema", { enumerable: true, get: function () { return graph_tools_js_1.GetNeighborsInputSchema; } });
Object.defineProperty(exports, "SubgraphQueryInputSchema", { enumerable: true, get: function () { return graph_tools_js_1.SubgraphQueryInputSchema; } });
Object.defineProperty(exports, "GraphStatsInputSchema", { enumerable: true, get: function () { return graph_tools_js_1.GraphStatsInputSchema; } });
var entity_tools_js_1 = require("./tools/entity-tools.js");
Object.defineProperty(exports, "createEntityTools", { enumerable: true, get: function () { return entity_tools_js_1.createEntityTools; } });
Object.defineProperty(exports, "SearchEntitiesInputSchema", { enumerable: true, get: function () { return entity_tools_js_1.SearchEntitiesInputSchema; } });
Object.defineProperty(exports, "GetEntityInputSchema", { enumerable: true, get: function () { return entity_tools_js_1.GetEntityInputSchema; } });
Object.defineProperty(exports, "CreateEntityInputSchema", { enumerable: true, get: function () { return entity_tools_js_1.CreateEntityInputSchema; } });
Object.defineProperty(exports, "FindSimilarEntitiesInputSchema", { enumerable: true, get: function () { return entity_tools_js_1.FindSimilarEntitiesInputSchema; } });
Object.defineProperty(exports, "ResolveEntityInputSchema", { enumerable: true, get: function () { return entity_tools_js_1.ResolveEntityInputSchema; } });
var investigation_tools_js_1 = require("./tools/investigation-tools.js");
Object.defineProperty(exports, "createInvestigationTools", { enumerable: true, get: function () { return investigation_tools_js_1.createInvestigationTools; } });
Object.defineProperty(exports, "GetInvestigationInputSchema", { enumerable: true, get: function () { return investigation_tools_js_1.GetInvestigationInputSchema; } });
Object.defineProperty(exports, "CreateHypothesisInputSchema", { enumerable: true, get: function () { return investigation_tools_js_1.CreateHypothesisInputSchema; } });
Object.defineProperty(exports, "UpdateHypothesisInputSchema", { enumerable: true, get: function () { return investigation_tools_js_1.UpdateHypothesisInputSchema; } });
Object.defineProperty(exports, "AddFindingInputSchema", { enumerable: true, get: function () { return investigation_tools_js_1.AddFindingInputSchema; } });
Object.defineProperty(exports, "LinkEntitiesToInvestigationInputSchema", { enumerable: true, get: function () { return investigation_tools_js_1.LinkEntitiesToInvestigationInputSchema; } });
Object.defineProperty(exports, "GetTimelineInputSchema", { enumerable: true, get: function () { return investigation_tools_js_1.GetTimelineInputSchema; } });
var analysis_tools_js_1 = require("./tools/analysis-tools.js");
Object.defineProperty(exports, "createAnalysisTools", { enumerable: true, get: function () { return analysis_tools_js_1.createAnalysisTools; } });
Object.defineProperty(exports, "DetectPatternsInputSchema", { enumerable: true, get: function () { return analysis_tools_js_1.DetectPatternsInputSchema; } });
Object.defineProperty(exports, "CentralityAnalysisInputSchema", { enumerable: true, get: function () { return analysis_tools_js_1.CentralityAnalysisInputSchema; } });
Object.defineProperty(exports, "AnomalyDetectionInputSchema", { enumerable: true, get: function () { return analysis_tools_js_1.AnomalyDetectionInputSchema; } });
Object.defineProperty(exports, "CompareEntitiesInputSchema", { enumerable: true, get: function () { return analysis_tools_js_1.CompareEntitiesInputSchema; } });
// ============================================================================
// Agents
// ============================================================================
var investigation_agent_js_1 = require("./agents/investigation-agent.js");
Object.defineProperty(exports, "createInvestigationAgent", { enumerable: true, get: function () { return investigation_agent_js_1.createInvestigationAgent; } });
var entity_resolution_agent_js_1 = require("./agents/entity-resolution-agent.js");
Object.defineProperty(exports, "createEntityResolutionAgent", { enumerable: true, get: function () { return entity_resolution_agent_js_1.createEntityResolutionAgent; } });
var analyst_agent_js_1 = require("./agents/analyst-agent.js");
Object.defineProperty(exports, "createAnalystAgent", { enumerable: true, get: function () { return analyst_agent_js_1.createAnalystAgent; } });
var prompts_js_1 = require("./agents/prompts.js");
Object.defineProperty(exports, "INVESTIGATION_AGENT_PROMPT", { enumerable: true, get: function () { return prompts_js_1.INVESTIGATION_AGENT_PROMPT; } });
Object.defineProperty(exports, "ENTITY_RESOLUTION_AGENT_PROMPT", { enumerable: true, get: function () { return prompts_js_1.ENTITY_RESOLUTION_AGENT_PROMPT; } });
Object.defineProperty(exports, "ANALYST_AGENT_PROMPT", { enumerable: true, get: function () { return prompts_js_1.ANALYST_AGENT_PROMPT; } });
Object.defineProperty(exports, "NARRATIVE_AGENT_PROMPT", { enumerable: true, get: function () { return prompts_js_1.NARRATIVE_AGENT_PROMPT; } });
Object.defineProperty(exports, "getSystemPrompt", { enumerable: true, get: function () { return prompts_js_1.getSystemPrompt; } });
// ============================================================================
// Memory
// ============================================================================
var graph_memory_js_1 = require("./memory/graph-memory.js");
Object.defineProperty(exports, "createGraphMemory", { enumerable: true, get: function () { return graph_memory_js_1.createGraphMemory; } });
// ============================================================================
// Governance
// ============================================================================
var index_js_1 = require("./governance/index.js");
Object.defineProperty(exports, "createGovernanceMiddleware", { enumerable: true, get: function () { return index_js_1.createGovernanceMiddleware; } });
Object.defineProperty(exports, "DEFAULT_TOOL_RISKS", { enumerable: true, get: function () { return index_js_1.DEFAULT_TOOL_RISKS; } });
const graph_tools_js_2 = require("./tools/graph-tools.js");
const entity_tools_js_2 = require("./tools/entity-tools.js");
const investigation_tools_js_2 = require("./tools/investigation-tools.js");
const analysis_tools_js_2 = require("./tools/analysis-tools.js");
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
function createAllTools(config) {
    const graphTools = (0, graph_tools_js_2.createGraphTools)(config);
    const entityTools = (0, entity_tools_js_2.createEntityTools)(config);
    const investigationTools = (0, investigation_tools_js_2.createInvestigationTools)(config);
    const analysisTools = (0, analysis_tools_js_2.createAnalysisTools)(config);
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
exports.ToolCategories = {
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
};
