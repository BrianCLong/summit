"use strict";
/**
 * GraphRAG Type Definitions
 * Semantic RAG Knowledge Graph types for evidence-first retrieval
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_CONFIG = exports.RAGTelemetrySchema = exports.PolicyDecisionSchema = exports.FusedContextSchema = exports.ContextSourceSchema = exports.RAGAnswerSchema = exports.RetrievalResultSchema = exports.RetrievalQuerySchema = exports.EvidenceChunkSchema = exports.GraphPathSchema = exports.CitationSourceSchema = void 0;
const zod_1 = require("zod");
// ============================================================================
// Core Entity Types
// ============================================================================
exports.CitationSourceSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    documentId: zod_1.z.string(),
    documentTitle: zod_1.z.string().optional(),
    spanStart: zod_1.z.number().int().min(0),
    spanEnd: zod_1.z.number().int().min(0),
    content: zod_1.z.string(),
    confidence: zod_1.z.number().min(0).max(1),
    sourceType: zod_1.z.enum(['document', 'graph', 'external', 'derived']),
    metadata: zod_1.z.record(zod_1.z.any()).optional(),
});
exports.GraphPathSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    nodes: zod_1.z.array(zod_1.z.object({
        id: zod_1.z.string(),
        type: zod_1.z.string(),
        label: zod_1.z.string(),
        properties: zod_1.z.record(zod_1.z.any()),
    })),
    edges: zod_1.z.array(zod_1.z.object({
        id: zod_1.z.string(),
        type: zod_1.z.string(),
        sourceId: zod_1.z.string(),
        targetId: zod_1.z.string(),
        properties: zod_1.z.record(zod_1.z.any()),
    })),
    pathLength: zod_1.z.number().int().min(1),
    confidence: zod_1.z.number().min(0).max(1),
    saliencyScore: zod_1.z.number().min(0).max(1),
    rationale: zod_1.z.string().optional(),
});
exports.EvidenceChunkSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    content: zod_1.z.string(),
    embedding: zod_1.z.array(zod_1.z.number()).optional(),
    citations: zod_1.z.array(exports.CitationSourceSchema),
    graphPaths: zod_1.z.array(exports.GraphPathSchema),
    relevanceScore: zod_1.z.number().min(0).max(1),
    temporalContext: zod_1.z.object({
        validFrom: zod_1.z.string().datetime().optional(),
        validTo: zod_1.z.string().datetime().optional(),
        eventTime: zod_1.z.string().datetime().optional(),
    }).optional(),
    policyLabels: zod_1.z.array(zod_1.z.string()).optional(),
    tenantId: zod_1.z.string(),
});
// ============================================================================
// Retrieval Types
// ============================================================================
exports.RetrievalQuerySchema = zod_1.z.object({
    query: zod_1.z.string().min(1).max(2000),
    tenantId: zod_1.z.string(),
    userId: zod_1.z.string().optional(),
    maxHops: zod_1.z.number().int().min(1).max(5).default(3),
    maxNodes: zod_1.z.number().int().min(10).max(10000).default(1000),
    maxDocuments: zod_1.z.number().int().min(1).max(100).default(20),
    minRelevance: zod_1.z.number().min(0).max(1).default(0.3),
    includeCitations: zod_1.z.boolean().default(true),
    includeGraphPaths: zod_1.z.boolean().default(true),
    includeCounterfactuals: zod_1.z.boolean().default(false),
    strategy: zod_1.z.enum(["BASELINE", "KG2RAG"]).default("BASELINE"),
    useKg2Rag: zod_1.z.boolean().optional(),
    temporalScope: zod_1.z.object({
        from: zod_1.z.string().datetime().optional(),
        to: zod_1.z.string().datetime().optional(),
    }).optional(),
    entityFilters: zod_1.z.array(zod_1.z.object({
        type: zod_1.z.string(),
        property: zod_1.z.string().optional(),
        value: zod_1.z.any().optional(),
    })).optional(),
    relationshipFilters: zod_1.z.array(zod_1.z.string()).optional(),
    policyContext: zod_1.z.object({
        clearanceLevel: zod_1.z.string().optional(),
        jurisdiction: zod_1.z.string().optional(),
        purpose: zod_1.z.string().optional(),
    }).optional(),
});
exports.RetrievalResultSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    query: zod_1.z.string(),
    evidenceChunks: zod_1.z.array(exports.EvidenceChunkSchema),
    subgraph: zod_1.z.object({
        nodes: zod_1.z.array(zod_1.z.object({
            id: zod_1.z.string(),
            type: zod_1.z.string(),
            label: zod_1.z.string(),
            properties: zod_1.z.record(zod_1.z.any()),
            saliency: zod_1.z.number().min(0).max(1),
        })),
        edges: zod_1.z.array(zod_1.z.object({
            id: zod_1.z.string(),
            type: zod_1.z.string(),
            sourceId: zod_1.z.string(),
            targetId: zod_1.z.string(),
            weight: zod_1.z.number().optional(),
        })),
    }),
    totalDocumentsSearched: zod_1.z.number().int(),
    totalNodesTraversed: zod_1.z.number().int(),
    processingTimeMs: zod_1.z.number(),
    metadata: zod_1.z.record(zod_1.z.any()).optional(),
});
// ============================================================================
// Answer Generation Types
// ============================================================================
exports.RAGAnswerSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    query: zod_1.z.string(),
    answer: zod_1.z.string(),
    citations: zod_1.z.array(zod_1.z.object({
        index: zod_1.z.number().int().min(1),
        source: exports.CitationSourceSchema,
        usedInAnswer: zod_1.z.boolean(),
    })),
    graphEvidence: zod_1.z.array(zod_1.z.object({
        path: exports.GraphPathSchema,
        explanation: zod_1.z.string(),
    })),
    confidence: zod_1.z.number().min(0).max(1),
    reasoning: zod_1.z.string().optional(),
    counterfactuals: zod_1.z.array(zod_1.z.object({
        change: zod_1.z.string(),
        wouldFlipAnswer: zod_1.z.boolean(),
        explanation: zod_1.z.string(),
    })).optional(),
    tokensUsed: zod_1.z.object({
        prompt: zod_1.z.number().int(),
        completion: zod_1.z.number().int(),
        total: zod_1.z.number().int(),
    }),
    modelUsed: zod_1.z.string(),
    processingTimeMs: zod_1.z.number(),
    tenantId: zod_1.z.string(),
    createdAt: zod_1.z.string().datetime(),
});
// ============================================================================
// Context Fusion Types
// ============================================================================
exports.ContextSourceSchema = zod_1.z.object({
    type: zod_1.z.enum(['graph', 'document', 'temporal', 'external']),
    content: zod_1.z.string(),
    relevance: zod_1.z.number().min(0).max(1),
    citations: zod_1.z.array(exports.CitationSourceSchema),
    metadata: zod_1.z.record(zod_1.z.any()).optional(),
});
exports.FusedContextSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    sources: zod_1.z.array(exports.ContextSourceSchema),
    fusedContent: zod_1.z.string(),
    conflictsResolved: zod_1.z.array(zod_1.z.object({
        sourceA: zod_1.z.string(),
        sourceB: zod_1.z.string(),
        conflict: zod_1.z.string(),
        resolution: zod_1.z.string(),
        confidence: zod_1.z.number().min(0).max(1),
    })),
    totalTokens: zod_1.z.number().int(),
    compressionRatio: zod_1.z.number().min(0).max(1),
});
// ============================================================================
// Policy Types
// ============================================================================
exports.PolicyDecisionSchema = zod_1.z.object({
    allowed: zod_1.z.boolean(),
    reason: zod_1.z.string().optional(),
    redactions: zod_1.z.array(zod_1.z.object({
        field: zod_1.z.string(),
        reason: zod_1.z.string(),
    })).optional(),
    auditLog: zod_1.z.object({
        policyId: zod_1.z.string(),
        evaluatedAt: zod_1.z.string().datetime(),
        userId: zod_1.z.string(),
        tenantId: zod_1.z.string(),
        action: zod_1.z.string(),
        resource: zod_1.z.string(),
    }),
});
// ============================================================================
// Telemetry Types
// ============================================================================
exports.RAGTelemetrySchema = zod_1.z.object({
    traceId: zod_1.z.string(),
    spanId: zod_1.z.string(),
    operationType: zod_1.z.enum(['retrieval', 'fusion', 'generation', 'policy_check']),
    durationMs: zod_1.z.number(),
    success: zod_1.z.boolean(),
    errorMessage: zod_1.z.string().optional(),
    metrics: zod_1.z.object({
        documentsRetrieved: zod_1.z.number().int().optional(),
        nodesTraversed: zod_1.z.number().int().optional(),
        tokensUsed: zod_1.z.number().int().optional(),
        cacheHit: zod_1.z.boolean().optional(),
    }),
});
exports.DEFAULT_CONFIG = {
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
