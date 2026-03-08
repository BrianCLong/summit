"use strict";
/**
 * Insights API Contract v1
 * CompanyOS product-facing API contracts for insights generation
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeleteInsightResponseV1 = exports.DeleteInsightRequestV1 = exports.ListInsightsResponseV1 = exports.InsightSummaryV1 = exports.ListInsightsRequestV1 = exports.GetPersonNetworkInsightResponseV1 = exports.GetInsightResponseV1 = exports.GetInsightRequestV1 = exports.CreatePersonNetworkInsightResponseV1 = exports.PersonNetworkInsightDataV1 = exports.CreatePersonNetworkInsightRequestV1 = exports.InsightStatusV1 = exports.InsightTypeV1 = void 0;
const zod_1 = require("zod");
const entities_js_1 = require("./entities.js");
const queries_js_1 = require("./queries.js");
/**
 * Insight types
 */
exports.InsightTypeV1 = zod_1.z.enum([
    'person-network',
    'organization-network',
    'relationship-analysis',
    'risk-assessment',
    'entity-summary',
]);
/**
 * Insight status
 */
exports.InsightStatusV1 = zod_1.z.enum(['pending', 'generating', 'completed', 'failed']);
/**
 * Create Person Network Insight Request
 */
exports.CreatePersonNetworkInsightRequestV1 = zod_1.z.object({
    version: zod_1.z.literal('v1').describe('API version'),
    personId: zod_1.z.string().uuid().describe('Person entity ID'),
    depth: zod_1.z.number().int().min(1).max(3).default(2).describe('Network analysis depth'),
    options: zod_1.z
        .object({
        includeAnalysis: zod_1.z.boolean().default(true).describe('Generate AI analysis'),
        maxNetworkSize: zod_1.z.number().int().positive().max(1000).optional().describe('Maximum network size'),
        relationshipTypes: zod_1.z
            .array(zod_1.z.enum(['colleague', 'family', 'business', 'friend', 'mentor', 'advisor', 'partner', 'unknown']))
            .optional()
            .describe('Filter by relationship types'),
    })
        .optional(),
    metadata: zod_1.z
        .object({
        requestedBy: zod_1.z.string().optional().describe('User who requested the insight'),
        correlationId: zod_1.z.string().uuid().optional().describe('Correlation ID for tracing'),
    })
        .optional(),
});
/**
 * Person Network Insight Data
 */
exports.PersonNetworkInsightDataV1 = zod_1.z.object({
    person: entities_js_1.PersonEntityV1.describe('Root person entity'),
    network: zod_1.z.object({
        size: zod_1.z.number().int().nonnegative().describe('Total network size'),
        associations: zod_1.z.array(queries_js_1.PersonAssociationV1).describe('Person associations'),
        clusters: zod_1.z
            .array(zod_1.z.object({
            id: zod_1.z.string().describe('Cluster identifier'),
            size: zod_1.z.number().int().positive().describe('Number of persons in cluster'),
            dominantRelationshipType: zod_1.z.string().optional().describe('Most common relationship type in cluster'),
        }))
            .optional()
            .describe('Network clusters'),
    }),
    summary: zod_1.z.string().describe('Human-readable summary of the network'),
    insights: zod_1.z
        .object({
        strongConnections: zod_1.z.number().int().nonnegative().optional().describe('Count of strong connections'),
        weakConnections: zod_1.z.number().int().nonnegative().optional().describe('Count of weak connections'),
        keyConnectors: zod_1.z
            .array(zod_1.z.object({
            personId: zod_1.z.string().uuid().describe('Person ID'),
            personName: zod_1.z.string().describe('Person name'),
            connectionCount: zod_1.z.number().int().positive().describe('Number of connections'),
        }))
            .optional()
            .describe('Key network connectors'),
        riskFactors: zod_1.z.array(zod_1.z.string()).optional().describe('Identified risk factors'),
    })
        .optional(),
});
/**
 * Create Person Network Insight Response
 */
exports.CreatePersonNetworkInsightResponseV1 = zod_1.z.object({
    version: zod_1.z.literal('v1').describe('API version'),
    insightId: zod_1.z.string().uuid().describe('Unique insight identifier'),
    type: zod_1.z.literal('person-network').describe('Insight type'),
    status: exports.InsightStatusV1.describe('Insight generation status'),
    data: exports.PersonNetworkInsightDataV1.optional().describe('Insight data (if completed)'),
    error: zod_1.z.string().optional().describe('Error message if failed'),
    metadata: zod_1.z.object({
        generatedAt: zod_1.z.string().datetime().describe('When the insight was generated'),
        maestroRunId: zod_1.z.string().uuid().describe('Maestro workflow run ID'),
        processingTimeMs: zod_1.z.number().nonnegative().optional().describe('Processing time in milliseconds'),
        requestedBy: zod_1.z.string().optional().describe('User who requested the insight'),
    }),
});
/**
 * Get Insight Request
 */
exports.GetInsightRequestV1 = zod_1.z.object({
    version: zod_1.z.literal('v1').describe('API version'),
    insightId: zod_1.z.string().uuid().describe('Insight ID'),
});
/**
 * Get Insight Response (generic)
 */
exports.GetInsightResponseV1 = zod_1.z.object({
    version: zod_1.z.literal('v1').describe('API version'),
    insightId: zod_1.z.string().uuid().describe('Insight ID'),
    type: exports.InsightTypeV1.describe('Insight type'),
    status: exports.InsightStatusV1.describe('Insight status'),
    data: zod_1.z.unknown().optional().describe('Insight data (type-specific)'),
    error: zod_1.z.string().optional().describe('Error message if failed'),
    metadata: zod_1.z.object({
        createdAt: zod_1.z.string().datetime().describe('When the insight was created'),
        updatedAt: zod_1.z.string().datetime().describe('When the insight was last updated'),
        completedAt: zod_1.z.string().datetime().optional().describe('When the insight completed'),
        requestedBy: zod_1.z.string().optional().describe('User who requested the insight'),
    }),
});
/**
 * Get Person Network Insight Response
 */
exports.GetPersonNetworkInsightResponseV1 = zod_1.z.object({
    version: zod_1.z.literal('v1').describe('API version'),
    insightId: zod_1.z.string().uuid().describe('Insight ID'),
    type: zod_1.z.literal('person-network').describe('Insight type'),
    status: exports.InsightStatusV1.describe('Insight status'),
    data: exports.PersonNetworkInsightDataV1.optional().describe('Insight data (if completed)'),
    error: zod_1.z.string().optional().describe('Error message if failed'),
    metadata: zod_1.z.object({
        createdAt: zod_1.z.string().datetime().describe('When the insight was created'),
        updatedAt: zod_1.z.string().datetime().describe('When the insight was last updated'),
        completedAt: zod_1.z.string().datetime().optional().describe('When the insight completed'),
        maestroRunId: zod_1.z.string().uuid().optional().describe('Maestro workflow run ID'),
        requestedBy: zod_1.z.string().optional().describe('User who requested the insight'),
    }),
});
/**
 * List Insights Request
 */
exports.ListInsightsRequestV1 = zod_1.z.object({
    version: zod_1.z.literal('v1').describe('API version'),
    filters: zod_1.z
        .object({
        type: exports.InsightTypeV1.optional().describe('Filter by insight type'),
        status: exports.InsightStatusV1.optional().describe('Filter by status'),
        requestedBy: zod_1.z.string().optional().describe('Filter by requestor'),
        createdAfter: zod_1.z.string().datetime().optional().describe('Filter by creation time'),
        createdBefore: zod_1.z.string().datetime().optional().describe('Filter by creation time'),
    })
        .optional(),
    pagination: zod_1.z
        .object({
        limit: zod_1.z.number().int().positive().max(100).default(20).describe('Maximum results per page'),
        offset: zod_1.z.number().int().nonnegative().default(0).describe('Pagination offset'),
    })
        .optional(),
});
/**
 * Insight summary (for list responses)
 */
exports.InsightSummaryV1 = zod_1.z.object({
    insightId: zod_1.z.string().uuid().describe('Insight ID'),
    type: exports.InsightTypeV1.describe('Insight type'),
    status: exports.InsightStatusV1.describe('Insight status'),
    createdAt: zod_1.z.string().datetime().describe('When the insight was created'),
    completedAt: zod_1.z.string().datetime().optional().describe('When the insight completed'),
});
/**
 * List Insights Response
 */
exports.ListInsightsResponseV1 = zod_1.z.object({
    version: zod_1.z.literal('v1').describe('API version'),
    insights: zod_1.z.array(exports.InsightSummaryV1).describe('Insight summaries'),
    pagination: zod_1.z.object({
        total: zod_1.z.number().int().nonnegative().describe('Total matching insights'),
        limit: zod_1.z.number().int().positive().describe('Results per page'),
        offset: zod_1.z.number().int().nonnegative().describe('Current offset'),
        hasMore: zod_1.z.boolean().describe('Whether more results are available'),
    }),
});
/**
 * Delete Insight Request
 */
exports.DeleteInsightRequestV1 = zod_1.z.object({
    version: zod_1.z.literal('v1').describe('API version'),
    insightId: zod_1.z.string().uuid().describe('Insight ID to delete'),
});
/**
 * Delete Insight Response
 */
exports.DeleteInsightResponseV1 = zod_1.z.object({
    version: zod_1.z.literal('v1').describe('API version'),
    insightId: zod_1.z.string().uuid().describe('Deleted insight ID'),
    deleted: zod_1.z.boolean().describe('Whether the insight was deleted'),
    deletedAt: zod_1.z.string().datetime().describe('When the insight was deleted'),
});
