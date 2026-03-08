"use strict";
/**
 * Semantic RAG Knowledge Graph Types
 * Type-safe definitions for agentic RAG orchestration
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AsiaPacScalingConfigSchema = exports.RegionConfigSchema = exports.WorkflowStageSchema = exports.SemanticRAGResponseSchema = exports.GroundingEvidenceSchema = exports.CitationSchema = exports.SemanticRAGRequestSchema = exports.TAXIICollectionSchema = exports.STIXObjectSchema = exports.STIXObjectTypeSchema = exports.GraphEdgeSchema = exports.GraphNodeSchema = exports.TraversalConfigSchema = exports.TraversalStrategySchema = exports.AgentStateSchema = exports.AgentRoleSchema = void 0;
const zod_1 = require("zod");
// ============================================================================
// Agent Types for Multi-Agent RAG Orchestration
// ============================================================================
exports.AgentRoleSchema = zod_1.z.enum([
    'planner', // Plans query execution strategy
    'retriever', // Retrieves relevant subgraphs and documents
    'grounding', // Validates and grounds responses in graph context
    'generator', // Generates final responses with citations
    'validator', // Validates output quality and hallucination checks
]);
exports.AgentStateSchema = zod_1.z.object({
    role: exports.AgentRoleSchema,
    status: zod_1.z.enum(['idle', 'running', 'completed', 'failed']),
    input: zod_1.z.any(),
    output: zod_1.z.any().optional(),
    startTime: zod_1.z.number(),
    endTime: zod_1.z.number().optional(),
    error: zod_1.z.string().optional(),
});
// ============================================================================
// Graph Traversal Types
// ============================================================================
exports.TraversalStrategySchema = zod_1.z.enum([
    'bfs', // Breadth-first search
    'dfs', // Depth-first search
    'personalized_pagerank', // Personalized PageRank for relevance
    'metapath', // Metapath-based semantic traversal
    'community_expansion', // Community detection + expansion
    'temporal_aware', // Time-weighted traversal
    'semantic_similarity', // Embedding-based similarity traversal
]);
exports.TraversalConfigSchema = zod_1.z.object({
    strategy: exports.TraversalStrategySchema,
    maxHops: zod_1.z.number().int().min(1).max(5).default(3),
    maxNodes: zod_1.z.number().int().min(10).max(1000).default(100),
    minConfidence: zod_1.z.number().min(0).max(1).default(0.5),
    dampingFactor: zod_1.z.number().min(0).max(1).default(0.85),
    temporalDecay: zod_1.z.number().min(0).max(1).default(0.9),
    communityThreshold: zod_1.z.number().min(0).max(1).default(0.7),
    metapath: zod_1.z.array(zod_1.z.string()).optional(),
});
// ============================================================================
// Graph Node and Edge Types
// ============================================================================
exports.GraphNodeSchema = zod_1.z.object({
    id: zod_1.z.string(),
    type: zod_1.z.string(),
    label: zod_1.z.string(),
    properties: zod_1.z.record(zod_1.z.string(), zod_1.z.any()),
    embedding: zod_1.z.array(zod_1.z.number()).optional(),
    confidence: zod_1.z.number().min(0).max(1).default(1.0),
    timestamp: zod_1.z.string().optional(),
    stixId: zod_1.z.string().optional(),
    threatScore: zod_1.z.number().min(0).max(10).optional(),
});
exports.GraphEdgeSchema = zod_1.z.object({
    id: zod_1.z.string(),
    type: zod_1.z.string(),
    sourceId: zod_1.z.string(),
    targetId: zod_1.z.string(),
    properties: zod_1.z.record(zod_1.z.string(), zod_1.z.any()),
    weight: zod_1.z.number().min(0).max(1).default(1.0),
    confidence: zod_1.z.number().min(0).max(1).default(1.0),
    timestamp: zod_1.z.string().optional(),
});
// ============================================================================
// STIX/TAXII Types for Threat Intelligence
// ============================================================================
exports.STIXObjectTypeSchema = zod_1.z.enum([
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
exports.STIXObjectSchema = zod_1.z.object({
    type: exports.STIXObjectTypeSchema,
    id: zod_1.z.string(),
    spec_version: zod_1.z.string().default('2.1'),
    created: zod_1.z.string(),
    modified: zod_1.z.string(),
    name: zod_1.z.string().optional(),
    description: zod_1.z.string().optional(),
    pattern: zod_1.z.string().optional(),
    pattern_type: zod_1.z.string().optional(),
    valid_from: zod_1.z.string().optional(),
    valid_until: zod_1.z.string().optional(),
    kill_chain_phases: zod_1.z.array(zod_1.z.object({
        kill_chain_name: zod_1.z.string(),
        phase_name: zod_1.z.string(),
    })).optional(),
    labels: zod_1.z.array(zod_1.z.string()).optional(),
    confidence: zod_1.z.number().min(0).max(100).optional(),
    external_references: zod_1.z.array(zod_1.z.object({
        source_name: zod_1.z.string(),
        url: zod_1.z.string().optional(),
        external_id: zod_1.z.string().optional(),
    })).optional(),
    source_ref: zod_1.z.string().optional(),
    target_ref: zod_1.z.string().optional(),
    relationship_type: zod_1.z.string().optional(),
});
exports.TAXIICollectionSchema = zod_1.z.object({
    id: zod_1.z.string(),
    title: zod_1.z.string(),
    description: zod_1.z.string().optional(),
    can_read: zod_1.z.boolean(),
    can_write: zod_1.z.boolean(),
    media_types: zod_1.z.array(zod_1.z.string()).optional(),
});
// ============================================================================
// Semantic RAG Request/Response Types
// ============================================================================
exports.SemanticRAGRequestSchema = zod_1.z.object({
    investigationId: zod_1.z.string().min(1),
    query: zod_1.z.string().min(3),
    focusEntities: zod_1.z.array(zod_1.z.string()).optional(),
    traversalConfig: exports.TraversalConfigSchema.optional(),
    includeVectorSearch: zod_1.z.boolean().default(true),
    includeThreatIntel: zod_1.z.boolean().default(true),
    maxContextTokens: zod_1.z.number().int().min(1000).max(32000).default(8000),
    temperature: zod_1.z.number().min(0).max(1).default(0.1),
    agentMode: zod_1.z.enum(['single', 'multi', 'consensus']).default('multi'),
    groundingLevel: zod_1.z.enum(['strict', 'moderate', 'relaxed']).default('moderate'),
});
exports.CitationSchema = zod_1.z.object({
    nodeId: zod_1.z.string(),
    nodeType: zod_1.z.string(),
    nodeLabel: zod_1.z.string(),
    relevanceScore: zod_1.z.number().min(0).max(1),
    excerpt: zod_1.z.string().optional(),
});
exports.GroundingEvidenceSchema = zod_1.z.object({
    claim: zod_1.z.string(),
    supportingNodes: zod_1.z.array(zod_1.z.string()),
    supportingPaths: zod_1.z.array(zod_1.z.object({
        from: zod_1.z.string(),
        to: zod_1.z.string(),
        via: zod_1.z.string(),
        type: zod_1.z.string(),
    })),
    confidence: zod_1.z.number().min(0).max(1),
    isGrounded: zod_1.z.boolean(),
});
exports.SemanticRAGResponseSchema = zod_1.z.object({
    answer: zod_1.z.string().min(1),
    confidence: zod_1.z.number().min(0).max(1),
    citations: zod_1.z.array(exports.CitationSchema),
    groundingEvidence: zod_1.z.array(exports.GroundingEvidenceSchema),
    threatContext: zod_1.z.object({
        relatedIOCs: zod_1.z.array(zod_1.z.string()),
        threatActors: zod_1.z.array(zod_1.z.string()),
        campaigns: zod_1.z.array(zod_1.z.string()),
        overallThreatScore: zod_1.z.number().min(0).max(10),
    }).optional(),
    executionMetrics: zod_1.z.object({
        totalTimeMs: zod_1.z.number(),
        traversalTimeMs: zod_1.z.number(),
        vectorSearchTimeMs: zod_1.z.number(),
        generationTimeMs: zod_1.z.number(),
        nodesExplored: zod_1.z.number(),
        pathsAnalyzed: zod_1.z.number(),
        tokensUsed: zod_1.z.number(),
    }),
    agentTrace: zod_1.z.array(zod_1.z.object({
        agent: exports.AgentRoleSchema,
        action: zod_1.z.string(),
        result: zod_1.z.string(),
        durationMs: zod_1.z.number(),
    })),
});
// ============================================================================
// Workflow Orchestration Types (34.1% efficiency gain target)
// ============================================================================
exports.WorkflowStageSchema = zod_1.z.enum([
    'query_understanding',
    'graph_exploration',
    'vector_retrieval',
    'threat_enrichment',
    'context_fusion',
    'response_generation',
    'grounding_validation',
    'output_formatting',
]);
// ============================================================================
// Asia-Pac Scaling Configuration
// ============================================================================
exports.RegionConfigSchema = zod_1.z.object({
    region: zod_1.z.string(),
    primaryEndpoint: zod_1.z.string(),
    fallbackEndpoints: zod_1.z.array(zod_1.z.string()),
    latencyThresholdMs: zod_1.z.number().default(200),
    maxConnections: zod_1.z.number().default(100),
    connectionPoolSize: zod_1.z.number().default(20),
    timeoutMs: zod_1.z.number().default(30000),
    retryAttempts: zod_1.z.number().default(3),
});
exports.AsiaPacScalingConfigSchema = zod_1.z.object({
    regions: zod_1.z.array(exports.RegionConfigSchema),
    loadBalancingStrategy: zod_1.z.enum(['round_robin', 'least_connections', 'latency_based']),
    dataResidency: zod_1.z.enum(['strict', 'preferred', 'flexible']),
    crossRegionReplication: zod_1.z.boolean(),
    cacheDistribution: zod_1.z.enum(['local', 'regional', 'global']),
});
