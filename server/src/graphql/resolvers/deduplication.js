"use strict";
/**
 * GraphQL resolvers for entity deduplication
 *
 * Modern pgvector-based duplicate detection replacing legacy O(n²) algorithm
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.deduplicationResolvers = void 0;
const SimilarityService_js_1 = require("../../services/SimilarityService.js");
const logger_js_1 = require("../../utils/logger.js");
const dedupLogger = logger_js_1.logger.child({ module: 'deduplication-resolvers' });
exports.deduplicationResolvers = {
    Query: {
        /**
         * Get duplicate entity candidates for an investigation
         * Uses semantic similarity + topology + provenance for accurate detection
         */
        deduplicationCandidates: async (_parent, args, context) => {
            try {
                const investigationId = args.investigationId;
                if (!investigationId) {
                    throw new Error('investigationId is required');
                }
                dedupLogger.info('Fetching deduplication candidates', {
                    investigationId,
                    threshold: args.threshold,
                    userId: context.user?.id,
                });
                const candidates = await SimilarityService_js_1.similarityService.findDuplicateCandidates({
                    investigationId,
                    threshold: args.threshold,
                    topK: 10, // Configurable if needed
                    includeReasons: true,
                    tenantId: context.tenant,
                });
                dedupLogger.debug('Deduplication candidates retrieved', {
                    investigationId,
                    count: candidates.length,
                });
                // Transform to match GraphQL schema expectations
                return candidates.map((candidate) => ({
                    entityA: {
                        id: candidate.entityA.id,
                        label: candidate.entityA.label,
                        description: null, // Can be populated from Neo4j if needed
                    },
                    entityB: {
                        id: candidate.entityB.id,
                        label: candidate.entityB.label,
                        description: null,
                    },
                    similarity: candidate.similarity,
                    reasons: candidate.reasons || [],
                    scores: candidate.scores,
                }));
            }
            catch (error) {
                dedupLogger.error('Failed to fetch deduplication candidates', {
                    investigationId: args.investigationId,
                    error: error instanceof Error ? error.message : 'Unknown error',
                });
                throw error;
            }
        },
    },
};
