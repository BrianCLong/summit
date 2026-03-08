"use strict";
/**
 * GraphQL Resolvers for GraphRAG Service
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolvers = void 0;
exports.resolvers = {
    Query: {
        health: async (_parent, _args, context) => {
            const health = await context.orchestrator.healthCheck();
            return {
                healthy: health.healthy,
                components: health.components,
                timestamp: new Date().toISOString(),
            };
        },
        previewNLQuery: async (_parent, args, context) => {
            return context.orchestrator.naturalLanguageToCypher(args.query, args.tenantId);
        },
    },
    Mutation: {
        graphRAGQuery: async (_parent, args, context) => {
            const { input } = args;
            const retrievalQuery = {
                query: input.query,
                tenantId: input.tenantId,
                userId: input.userId,
                maxHops: input.maxHops ?? 3,
                maxNodes: input.maxNodes ?? 1000,
                maxDocuments: input.maxDocuments ?? 20,
                minRelevance: input.minRelevance ?? 0.3,
                includeCitations: input.includeCitations ?? true,
                includeGraphPaths: input.includeGraphPaths ?? true,
                includeCounterfactuals: input.includeCounterfactuals ?? false,
                strategy: input.strategy ?? (input.useKg2Rag ? "KG2RAG" : "BASELINE"),
                useKg2Rag: input.useKg2Rag,
                temporalScope: input.temporalScope,
                entityFilters: input.entityFilters,
                relationshipFilters: input.relationshipFilters,
                policyContext: input.policyContext,
            };
            const response = await context.orchestrator.query(retrievalQuery, {
                includeCounterfactuals: input.includeCounterfactuals,
                includeSensitivityAnalysis: input.includeSensitivityAnalysis,
                temporalScope: input.temporalScope
                    ? {
                        from: input.temporalScope.from
                            ? new Date(input.temporalScope.from)
                            : undefined,
                        to: input.temporalScope.to
                            ? new Date(input.temporalScope.to)
                            : undefined,
                        pointInTime: input.temporalScope.pointInTime
                            ? new Date(input.temporalScope.pointInTime)
                            : undefined,
                        granularity: input.temporalScope.granularity,
                    }
                    : undefined,
                policyContext: input.policyContext
                    ? {
                        userId: input.policyContext.userId,
                        tenantId: input.tenantId,
                        roles: input.policyContext.roles,
                        clearanceLevel: input.policyContext.clearanceLevel,
                        jurisdiction: input.policyContext.jurisdiction,
                        purpose: input.policyContext.purpose,
                        accessGroups: input.policyContext.accessGroups,
                    }
                    : undefined,
                maxTokens: input.maxTokens,
                temperature: input.temperature,
            });
            return response;
        },
        executeNLQuery: async (_parent, args, context) => {
            return context.orchestrator.naturalLanguageToCypher(args.query, args.tenantId);
        },
        generateHypotheses: async (_parent, args, _context) => {
            // This would use the LLM to generate hypotheses
            // Simplified implementation
            return [
                {
                    hypothesis: 'Hypothesis generation requires evidence retrieval first',
                    confidence: 0.5,
                    supportingEvidence: [],
                    contradictingEvidence: [],
                },
            ];
        },
        indexDocument: async (_parent, args, context) => {
            try {
                const chunksIndexed = await context.orchestrator.indexDocument(args.documentId, args.title || args.documentId, args.content, args.tenantId, args.metadata);
                return {
                    documentId: args.documentId,
                    chunksIndexed,
                    success: true,
                };
            }
            catch (error) {
                return {
                    documentId: args.documentId,
                    chunksIndexed: 0,
                    success: false,
                };
            }
        },
        indexDocuments: async (_parent, args, context) => {
            const results = await Promise.all(args.documents.map(async (doc) => {
                try {
                    const chunks = await context.orchestrator.indexDocument(doc.id, doc.title || doc.id, doc.content, args.tenantId, doc.metadata);
                    return { documentId: doc.id, chunksIndexed: chunks, success: true };
                }
                catch {
                    return { documentId: doc.id, chunksIndexed: 0, success: false };
                }
            }));
            return {
                total: args.documents.length,
                successful: results.filter((r) => r.success).length,
                failed: results.filter((r) => !r.success).length,
                results,
            };
        },
    },
    // Custom scalar resolvers
    DateTime: {
        serialize: (value) => {
            if (value instanceof Date) {
                return value.toISOString();
            }
            return value;
        },
        parseValue: (value) => new Date(value),
    },
    JSON: {
        serialize: (value) => value,
        parseValue: (value) => value,
    },
};
