/**
 * Semantic RAG Knowledge Graph Types
 * Type-safe definitions for agentic RAG orchestration
 */

import * as z from 'zod';

// ============================================================================
// Agent Types for Multi-Agent RAG Orchestration
// ============================================================================

export const AgentRoleSchema = z.enum([
  'planner',      // Plans query execution strategy
  'retriever',    // Retrieves relevant subgraphs and documents
  'grounding',    // Validates and grounds responses in graph context
  'generator',    // Generates final responses with citations
  'validator',    // Validates output quality and hallucination checks
]);

export type AgentRole = z.infer<typeof AgentRoleSchema>;

export const AgentStateSchema = z.object({
  role: AgentRoleSchema,
  status: z.enum(['idle', 'running', 'completed', 'failed']),
  input: z.any(),
  output: z.any().optional(),
  startTime: z.number(),
  endTime: z.number().optional(),
  error: z.string().optional(),
});

export type AgentState = z.infer<typeof AgentStateSchema>;

// ============================================================================
// Graph Traversal Types
// ============================================================================

export const TraversalStrategySchema = z.enum([
  'bfs',                    // Breadth-first search
  'dfs',                    // Depth-first search
  'personalized_pagerank',  // Personalized PageRank for relevance
  'metapath',               // Metapath-based semantic traversal
  'community_expansion',    // Community detection + expansion
  'temporal_aware',         // Time-weighted traversal
  'semantic_similarity',    // Embedding-based similarity traversal
]);

export type TraversalStrategy = z.infer<typeof TraversalStrategySchema>;

export const TraversalConfigSchema = z.object({
  strategy: TraversalStrategySchema,
  maxHops: z.number().int().min(1).max(5).default(3),
  maxNodes: z.number().int().min(10).max(1000).default(100),
  minConfidence: z.number().min(0).max(1).default(0.5),
  dampingFactor: z.number().min(0).max(1).default(0.85),
  temporalDecay: z.number().min(0).max(1).default(0.9),
  communityThreshold: z.number().min(0).max(1).default(0.7),
  metapath: z.array(z.string()).optional(),
});

export type TraversalConfig = z.infer<typeof TraversalConfigSchema>;

export interface TraversalResult {
  nodes: GraphNode[];
  edges: GraphEdge[];
  paths: GraphPath[];
  scores: Map<string, number>;
  communities: Map<string, string[]>;
  executionTimeMs: number;
}

// ============================================================================
// Graph Node and Edge Types
// ============================================================================

export const GraphNodeSchema = z.object({
  id: z.string(),
  type: z.string(),
  label: z.string(),
  properties: z.record(z.any()),
  embedding: z.array(z.number()).optional(),
  confidence: z.number().min(0).max(1).default(1.0),
  timestamp: z.string().optional(),
  stixId: z.string().optional(),
  threatScore: z.number().min(0).max(10).optional(),
});

export type GraphNode = z.infer<typeof GraphNodeSchema>;

export const GraphEdgeSchema = z.object({
  id: z.string(),
  type: z.string(),
  sourceId: z.string(),
  targetId: z.string(),
  properties: z.record(z.any()),
  weight: z.number().min(0).max(1).default(1.0),
  confidence: z.number().min(0).max(1).default(1.0),
  timestamp: z.string().optional(),
});

export type GraphEdge = z.infer<typeof GraphEdgeSchema>;

export interface GraphPath {
  nodes: GraphNode[];
  edges: GraphEdge[];
  score: number;
  semanticRelevance: number;
  temporalCoherence: number;
}

// ============================================================================
// STIX/TAXII Types for Threat Intelligence
// ============================================================================

export const STIXObjectTypeSchema = z.enum([
  'indicator',
  'malware',
  'threat-actor',
  'campaign',
  'attack-pattern',
  'course-of-action',
  'identity',
  'infrastructure',
  'intrusion-set',
  'location',
  'tool',
  'vulnerability',
  'observed-data',
  'report',
  'grouping',
  'note',
  'opinion',
  'relationship',
  'sighting',
]);

export type STIXObjectType = z.infer<typeof STIXObjectTypeSchema>;

export const STIXObjectSchema = z.object({
  type: STIXObjectTypeSchema,
  id: z.string(),
  spec_version: z.string().default('2.1'),
  created: z.string(),
  modified: z.string(),
  name: z.string().optional(),
  description: z.string().optional(),
  pattern: z.string().optional(),
  pattern_type: z.string().optional(),
  valid_from: z.string().optional(),
  valid_until: z.string().optional(),
  kill_chain_phases: z.array(z.object({
    kill_chain_name: z.string(),
    phase_name: z.string(),
  })).optional(),
  labels: z.array(z.string()).optional(),
  confidence: z.number().min(0).max(100).optional(),
  external_references: z.array(z.object({
    source_name: z.string(),
    url: z.string().optional(),
    external_id: z.string().optional(),
  })).optional(),
  source_ref: z.string().optional(),
  target_ref: z.string().optional(),
  relationship_type: z.string().optional(),
});

export type STIXObject = z.infer<typeof STIXObjectSchema>;

export const TAXIICollectionSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  can_read: z.boolean(),
  can_write: z.boolean(),
  media_types: z.array(z.string()).optional(),
});

export type TAXIICollection = z.infer<typeof TAXIICollectionSchema>;

export interface IOCCorrelation {
  stixId: string;
  graphNodeId: string;
  correlationType: 'exact' | 'partial' | 'semantic';
  confidence: number;
  matchedFields: string[];
  threatScore: number;
}

// ============================================================================
// Semantic RAG Request/Response Types
// ============================================================================

export const SemanticRAGRequestSchema = z.object({
  investigationId: z.string().min(1),
  query: z.string().min(3),
  focusEntities: z.array(z.string()).optional(),
  traversalConfig: TraversalConfigSchema.optional(),
  includeVectorSearch: z.boolean().default(true),
  includeThreatIntel: z.boolean().default(true),
  maxContextTokens: z.number().int().min(1000).max(32000).default(8000),
  temperature: z.number().min(0).max(1).default(0.1),
  agentMode: z.enum(['single', 'multi', 'consensus']).default('multi'),
  groundingLevel: z.enum(['strict', 'moderate', 'relaxed']).default('moderate'),
});

export type SemanticRAGRequest = z.infer<typeof SemanticRAGRequestSchema>;

export const CitationSchema = z.object({
  nodeId: z.string(),
  nodeType: z.string(),
  nodeLabel: z.string(),
  relevanceScore: z.number().min(0).max(1),
  excerpt: z.string().optional(),
});

export type Citation = z.infer<typeof CitationSchema>;

export const GroundingEvidenceSchema = z.object({
  claim: z.string(),
  supportingNodes: z.array(z.string()),
  supportingPaths: z.array(z.object({
    from: z.string(),
    to: z.string(),
    via: z.string(),
    type: z.string(),
  })),
  confidence: z.number().min(0).max(1),
  isGrounded: z.boolean(),
});

export type GroundingEvidence = z.infer<typeof GroundingEvidenceSchema>;

export const SemanticRAGResponseSchema = z.object({
  answer: z.string().min(1),
  confidence: z.number().min(0).max(1),
  citations: z.array(CitationSchema),
  groundingEvidence: z.array(GroundingEvidenceSchema),
  threatContext: z.object({
    relatedIOCs: z.array(z.string()),
    threatActors: z.array(z.string()),
    campaigns: z.array(z.string()),
    overallThreatScore: z.number().min(0).max(10),
  }).optional(),
  executionMetrics: z.object({
    totalTimeMs: z.number(),
    traversalTimeMs: z.number(),
    vectorSearchTimeMs: z.number(),
    generationTimeMs: z.number(),
    nodesExplored: z.number(),
    pathsAnalyzed: z.number(),
    tokensUsed: z.number(),
  }),
  agentTrace: z.array(z.object({
    agent: AgentRoleSchema,
    action: z.string(),
    result: z.string(),
    durationMs: z.number(),
  })),
});

export type SemanticRAGResponse = z.infer<typeof SemanticRAGResponseSchema>;

// ============================================================================
// Workflow Orchestration Types (34.1% efficiency gain target)
// ============================================================================

export const WorkflowStageSchema = z.enum([
  'query_understanding',
  'graph_exploration',
  'vector_retrieval',
  'threat_enrichment',
  'context_fusion',
  'response_generation',
  'grounding_validation',
  'output_formatting',
]);

export type WorkflowStage = z.infer<typeof WorkflowStageSchema>;

export interface WorkflowMetrics {
  stage: WorkflowStage;
  startTime: number;
  endTime: number;
  itemsProcessed: number;
  cacheHits: number;
  cacheMisses: number;
  parallelization: number;
}

export interface OrchestratorState {
  requestId: string;
  stages: Map<WorkflowStage, WorkflowMetrics>;
  currentStage: WorkflowStage;
  agentStates: Map<AgentRole, AgentState>;
  intermediateResults: Map<string, any>;
  errors: Error[];
  cancelled: boolean;
}

// ============================================================================
// Asia-Pac Scaling Configuration
// ============================================================================

export const RegionConfigSchema = z.object({
  region: z.string(),
  primaryEndpoint: z.string(),
  fallbackEndpoints: z.array(z.string()),
  latencyThresholdMs: z.number().default(200),
  maxConnections: z.number().default(100),
  connectionPoolSize: z.number().default(20),
  timeoutMs: z.number().default(30000),
  retryAttempts: z.number().default(3),
});

export type RegionConfig = z.infer<typeof RegionConfigSchema>;

export const AsiaPacScalingConfigSchema = z.object({
  regions: z.array(RegionConfigSchema),
  loadBalancingStrategy: z.enum(['round_robin', 'least_connections', 'latency_based']),
  dataResidency: z.enum(['strict', 'preferred', 'flexible']),
  crossRegionReplication: z.boolean(),
  cacheDistribution: z.enum(['local', 'regional', 'global']),
});

export type AsiaPacScalingConfig = z.infer<typeof AsiaPacScalingConfigSchema>;
