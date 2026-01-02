/**
 * GraphQL resolvers for entity deduplication
 *
 * Modern pgvector-based duplicate detection replacing legacy O(n²) algorithm
 */

import { similarityService } from '../../services/SimilarityService.js';
import type { Context as GraphQLContext } from '../context.js';
import { logger } from '../../utils/logger.js';

const dedupLogger = logger.child({ module: 'deduplication-resolvers' });

export interface DeduplicationCandidateInput {
  investigationId: string;
  threshold?: number;
  topK?: number;
  includeReasons?: boolean;
}

export const deduplicationResolvers = {
  Query: {
    /**
     * Get duplicate entity candidates for an investigation
     * Uses semantic similarity + topology + provenance for accurate detection
     */
    deduplicationCandidates: async (
      _parent: unknown,
      args: { investigationId?: string; threshold?: number },
      context: GraphQLContext,
    ) => {
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

        const candidates = await similarityService.findDuplicateCandidates({
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
      } catch (error: any) {
        dedupLogger.error('Failed to fetch deduplication candidates', {
          investigationId: args.investigationId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        throw error;
      }
    },
  },
};
