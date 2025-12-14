/**
 * GraphRAG Type Definitions
 * Semantic RAG Knowledge Graph types for evidence-first retrieval
 */

import { z } from 'zod';

// ============================================================================
// Core Entity Types
// ============================================================================

export const CitationSourceSchema = z.object({
  id: z.string().uuid(),
  documentId: z.string(),
  documentTitle: z.string().optional(),
  spanStart: z.number().int().min(0),
  spanEnd: z.number().int().min(0),
  content: z.string(),
  confidence: z.number().min(0).max(1),
  sourceType: z.enum(['document', 'graph', 'external', 'derived']),
  metadata: z.record(z.any()).optional(),
});

export type CitationSource = z.infer<typeof CitationSourceSchema>;

export const GraphPathSchema = z.object({
  id: z.string().uuid(),
  nodes: z.array(z.object({
    id: z.string(),
    type: z.string(),
    label: z.string(),
    properties: z.record(z.any()),
  })),
  edges: z.array(z.object({
    id: z.string(),
    type: z.string(),
    sourceId: z.string(),
    targetId: z.string(),
    properties: z.record(z.any()),
  })),
  pathLength: z.number().int().min(1),
  confidence: z.number().min(0).max(1),
  saliencyScore: z.number().min(0).max(1),
  rationale: z.string().optional(),
});

export type GraphPath = z.infer<typeof GraphPathSchema>;

export const EvidenceChunkSchema = z.object({
  id: z.string().uuid(),
  content: z.string(),
  embedding: z.array(z.number()).optional(),
  citations: z.array(CitationSourceSchema),
  graphPaths: z.array(GraphPathSchema),
  relevanceScore: z.number().min(0).max(1),
  temporalContext: z.object({
    validFrom: z.string().datetime().optional(),
    validTo: z.string().datetime().optional(),
    eventTime: z.string().datetime().optional(),
  }).optional(),
  policyLabels: z.array(z.string()).optional(),
  tenantId: z.string(),
});

export type EvidenceChunk = z.infer<typeof EvidenceChunkSchema>;

// ============================================================================
// Retrieval Types
// ============================================================================

export const RetrievalQuerySchema = z.object({
  query: z.string().min(1).max(2000),
  tenantId: z.string(),
  userId: z.string().optional(),
  maxHops: z.number().int().min(1).max(5).default(3),
  maxNodes: z.number().int().min(10).max(10000).default(1000),
  maxDocuments: z.number().int().min(1).max(100).default(20),
  minRelevance: z.number().min(0).max(1).default(0.3),
  includeCitations: z.boolean().default(true),
  includeGraphPaths: z.boolean().default(true),
  includeCounterfactuals: z.boolean().default(false),
  temporalScope: z.object({
    from: z.string().datetime().optional(),
    to: z.string().datetime().optional(),
  }).optional(),
  entityFilters: z.array(z.object({
    type: z.string(),
    property: z.string().optional(),
    value: z.any().optional(),
  })).optional(),
  relationshipFilters: z.array(z.string()).optional(),
  policyContext: z.object({
    clearanceLevel: z.string().optional(),
    jurisdiction: z.string().optional(),
    purpose: z.string().optional(),
  }).optional(),
});

export type RetrievalQuery = z.infer<typeof RetrievalQuerySchema>;

export const RetrievalResultSchema = z.object({
  id: z.string().uuid(),
  query: z.string(),
  evidenceChunks: z.array(EvidenceChunkSchema),
  subgraph: z.object({
    nodes: z.array(z.object({
      id: z.string(),
      type: z.string(),
      label: z.string(),
      properties: z.record(z.any()),
      saliency: z.number().min(0).max(1),
    })),
    edges: z.array(z.object({
      id: z.string(),
      type: z.string(),
      sourceId: z.string(),
      targetId: z.string(),
      weight: z.number().optional(),
    })),
  }),
  totalDocumentsSearched: z.number().int(),
  totalNodesTraversed: z.number().int(),
  processingTimeMs: z.number(),
  metadata: z.record(z.any()).optional(),
});

export type RetrievalResult = z.infer<typeof RetrievalResultSchema>;

// ============================================================================
// Answer Generation Types
// ============================================================================

export const RAGAnswerSchema = z.object({
  id: z.string().uuid(),
  query: z.string(),
  answer: z.string(),
  citations: z.array(z.object({
    index: z.number().int().min(1),
    source: CitationSourceSchema,
    usedInAnswer: z.boolean(),
  })),
  graphEvidence: z.array(z.object({
    path: GraphPathSchema,
    explanation: z.string(),
  })),
  confidence: z.number().min(0).max(1),
  reasoning: z.string().optional(),
  counterfactuals: z.array(z.object({
    change: z.string(),
    wouldFlipAnswer: z.boolean(),
    explanation: z.string(),
  })).optional(),
  tokensUsed: z.object({
    prompt: z.number().int(),
    completion: z.number().int(),
    total: z.number().int(),
  }),
  modelUsed: z.string(),
  processingTimeMs: z.number(),
  tenantId: z.string(),
  createdAt: z.string().datetime(),
});

export type RAGAnswer = z.infer<typeof RAGAnswerSchema>;

// ============================================================================
// Context Fusion Types
// ============================================================================

export const ContextSourceSchema = z.object({
  type: z.enum(['graph', 'document', 'temporal', 'external']),
  content: z.string(),
  relevance: z.number().min(0).max(1),
  citations: z.array(CitationSourceSchema),
  metadata: z.record(z.any()).optional(),
});

export type ContextSource = z.infer<typeof ContextSourceSchema>;

export const FusedContextSchema = z.object({
  id: z.string().uuid(),
  sources: z.array(ContextSourceSchema),
  fusedContent: z.string(),
  conflictsResolved: z.array(z.object({
    sourceA: z.string(),
    sourceB: z.string(),
    conflict: z.string(),
    resolution: z.string(),
    confidence: z.number().min(0).max(1),
  })),
  totalTokens: z.number().int(),
  compressionRatio: z.number().min(0).max(1),
});

export type FusedContext = z.infer<typeof FusedContextSchema>;

// ============================================================================
// Policy Types
// ============================================================================

export const PolicyDecisionSchema = z.object({
  allowed: z.boolean(),
  reason: z.string().optional(),
  redactions: z.array(z.object({
    field: z.string(),
    reason: z.string(),
  })).optional(),
  auditLog: z.object({
    policyId: z.string(),
    evaluatedAt: z.string().datetime(),
    userId: z.string(),
    tenantId: z.string(),
    action: z.string(),
    resource: z.string(),
  }),
});

export type PolicyDecision = z.infer<typeof PolicyDecisionSchema>;

// ============================================================================
// Telemetry Types
// ============================================================================

export const RAGTelemetrySchema = z.object({
  traceId: z.string(),
  spanId: z.string(),
  operationType: z.enum(['retrieval', 'fusion', 'generation', 'policy_check']),
  durationMs: z.number(),
  success: z.boolean(),
  errorMessage: z.string().optional(),
  metrics: z.object({
    documentsRetrieved: z.number().int().optional(),
    nodesTraversed: z.number().int().optional(),
    tokensUsed: z.number().int().optional(),
    cacheHit: z.boolean().optional(),
  }),
});

export type RAGTelemetry = z.infer<typeof RAGTelemetrySchema>;

// ============================================================================
// Configuration Types
// ============================================================================

export interface GraphRAGConfig {
  neo4j: {
    uri: string;
    username: string;
    password: string;
  };
  redis: {
    url: string;
  };
  openai: {
    apiKey: string;
    model: string;
    embeddingModel: string;
  };
  retrieval: {
    maxHops: number;
    maxNodes: number;
    maxDocuments: number;
    minRelevance: number;
    embeddingDimensions: number;
  };
  generation: {
    maxTokens: number;
    temperature: number;
    topP: number;
  };
  policy: {
    enabled: boolean;
    opaEndpoint?: string;
  };
  telemetry: {
    enabled: boolean;
    serviceName: string;
  };
}

export const DEFAULT_CONFIG: Partial<GraphRAGConfig> = {
  retrieval: {
    maxHops: 3,
    maxNodes: 1000,
    maxDocuments: 20,
    minRelevance: 0.3,
    embeddingDimensions: 1536,
  },
  generation: {
    maxTokens: 1000,
    temperature: 0.7,
    topP: 0.9,
  },
  policy: {
    enabled: true,
  },
  telemetry: {
    enabled: true,
    serviceName: 'graphrag',
  },
};
