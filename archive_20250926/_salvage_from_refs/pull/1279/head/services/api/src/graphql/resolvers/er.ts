/**
 * Entity Resolution GraphQL Resolvers
 *
 * Implements ER adjudication queue, confidence management, and decision processing
 */

import { IResolvers } from '@graphql-tools/utils';
import { Pool } from 'pg';
import pino from 'pino';
import { randomUUID } from 'crypto';

import { ERIntakeService } from '../../../er/src/intake';
import { AutoMergeService } from '../../../er/src/autoMerge';
import { defaultConfidenceEngine } from '../../../er/src/confidence';
import { businessMetrics } from '../../../gateway/src/observability/telemetry';

const logger = pino({ name: 'er-resolvers' });

// Mock database connection (replace with actual connection)
const db = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DB || 'intelgraph_er',
  user: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || 'password',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Mock Neo4j driver (replace with actual driver)
const neo4jDriver = {
  session: () => ({
    run: async () => ({ summary: { counters: { updates: () => ({ nodesCreated: 0, nodesDeleted: 1, relationshipsCreated: 0, relationshipsDeleted: 0, propertiesSet: 5 }) } } }),
    close: async () => {}
  })
} as any;

// Initialize services
const intakeService = new ERIntakeService(db, defaultConfidenceEngine);
const autoMergeService = new AutoMergeService(db, neo4jDriver);

export const erResolvers: IResolvers = {
  Query: {
    erQueue: async (_, { input }, context) => {
      try {
        logger.info({
          tenantId: input.tenantId,
          confidenceBand: input.confidenceBand,
          entityType: input.entityType,
          userId: context.user?.id
        }, 'ER queue request');

        const candidates = await getQueueCandidates(input);
        const totalCount = await getQueueCount(input);
        const queueStats = await intakeService.getQueueStats(input.tenantId);

        return {
          candidates,
          totalCount,
          hasMore: input.offset + candidates.length < totalCount,
          queueStats: formatQueueStats(queueStats)
        };

      } catch (error) {
        logger.error({ error, input }, 'ER queue query failed');
        throw error;
      }
    },

    erCandidate: async (_, { id }, context) => {
      try {
        const candidate = await getCandidateById(id);
        if (!candidate) {
          throw new Error(`Candidate ${id} not found`);
        }

        return formatCandidate(candidate);

      } catch (error) {
        logger.error({ error, candidateId: id }, 'ER candidate query failed');
        throw error;
      }
    },

    erStats: async (_, { tenantId, days }, context) => {
      try {
        const [queueStats, decisionStats, autoMergeStats, confidenceDistribution, performanceMetrics] = await Promise.all([
          intakeService.getQueueStats(tenantId),
          getDecisionStats(tenantId, days),
          autoMergeService.getAutoMergeStats(tenantId, days),
          getConfidenceDistribution(tenantId, days),
          getPerformanceMetrics(tenantId, days)
        ]);

        return {
          queueStats: formatQueueStats(queueStats),
          decisionStats: formatDecisionStats(decisionStats),
          autoMergeStats: formatAutoMergeStats(autoMergeStats),
          confidenceDistribution: formatConfidenceDistribution(confidenceDistribution),
          performanceMetrics: formatPerformanceMetrics(performanceMetrics)
        };

      } catch (error) {
        logger.error({ error, tenantId, days }, 'ER stats query failed');
        throw error;
      }
    },

    erConfig: async (_, { tenantId }, context) => {
      try {
        const config = await getTenantConfig(tenantId);
        const factors = await getSimilarityFactors();

        return {
          ...config,
          similarityFactors: factors.map(formatSimilarityFactor)
        };

      } catch (error) {
        logger.error({ error, tenantId }, 'ER config query failed');
        throw error;
      }
    }
  },

  Mutation: {
    erSubmitCandidates: async (_, { input }, context) => {
      const start_time = Date.now();

      try {
        logger.info({
          tenantId: input.tenantId,
          candidateCount: input.candidates.length,
          userId: context.user?.id,
          sourceSystem: input.sourceSystem
        }, 'ER candidates submission');

        const result = await intakeService.processBatch({
          candidates: input.candidates,
          tenant_id: input.tenantId,
          user_id: context.user?.id,
          source_system: input.sourceSystem,
          batch_metadata: input.batchMetadata
        });

        // Track metrics
        businessMetrics.erCandidatesTotal.add(result.processed_count, {
          tenant_id: input.tenantId,
          source_system: input.sourceSystem || 'unknown'
        });

        return {
          batchId: result.batch_id,
          processedCount: result.processed_count,
          successfulCount: result.successful_count,
          failedCount: result.failed_count,
          autoMergedCount: result.auto_merged_count,
          queuedCount: result.queued_count,
          duplicateCount: result.duplicate_count,
          processingTimeMs: result.processing_time_ms,
          results: result.results.map(formatSubmitResult)
        };

      } catch (error) {
        logger.error({ error, input }, 'ER candidates submission failed');
        throw error;
      }
    },

    erMakeDecision: async (_, { input }, context) => {
      const start_time = Date.now();

      try {
        logger.info({
          candidateId: input.candidateId,
          decision: input.decision,
          userId: context.user?.id,
          reason: input.reason
        }, 'ER decision made');

        const result = await makeDecision(
          input.candidateId,
          input.decision,
          context.user?.id,
          input.reason,
          input.metadata
        );

        const processing_time_ms = Date.now() - start_time;

        // Track metrics
        businessMetrics.erDecisionsTotal.add(1, {
          decision: input.decision.toLowerCase(),
          decided_by_user: !!context.user?.id
        });

        return {
          candidateId: input.candidateId,
          decision: input.decision,
          newStatus: result.newStatus,
          processingTimeMs: processing_time_ms,
          mergeStats: result.mergeStats
        };

      } catch (error) {
        logger.error({ error, input }, 'ER decision failed');
        throw error;
      }
    },

    erBulkDecision: async (_, { input }, context) => {
      const start_time = Date.now();

      try {
        logger.info({
          candidateCount: input.candidateIds.length,
          decision: input.decision,
          userId: context.user?.id
        }, 'ER bulk decision');

        const results = [];
        let successfulCount = 0;
        let failedCount = 0;

        for (const candidateId of input.candidateIds) {
          try {
            const result = await makeDecision(
              candidateId,
              input.decision,
              context.user?.id,
              input.reason,
              input.metadata
            );

            results.push({
              candidateId,
              decision: input.decision,
              newStatus: result.newStatus,
              processingTimeMs: Date.now() - start_time,
              mergeStats: result.mergeStats
            });

            successfulCount++;
          } catch (error) {
            logger.error({ error, candidateId }, 'Bulk decision item failed');
            failedCount++;
          }
        }

        const processing_time_ms = Date.now() - start_time;

        // Track metrics
        businessMetrics.erDecisionsTotal.add(successfulCount, {
          decision: input.decision.toLowerCase(),
          decided_by_user: !!context.user?.id,
          bulk: 'true'
        });

        return {
          processedCount: input.candidateIds.length,
          successfulCount,
          failedCount,
          results,
          processingTimeMs: processing_time_ms
        };

      } catch (error) {
        logger.error({ error, input }, 'ER bulk decision failed');
        throw error;
      }
    },

    erUndoDecision: async (_, { candidateId, reason }, context) => {
      try {
        logger.info({
          candidateId,
          userId: context.user?.id,
          reason
        }, 'ER decision undo');

        const result = await makeDecision(
          candidateId,
          'UNDO',
          context.user?.id,
          reason
        );

        return {
          candidateId,
          decision: 'UNDO',
          newStatus: result.newStatus,
          processingTimeMs: 0,
          mergeStats: null
        };

      } catch (error) {
        logger.error({ error, candidateId }, 'ER undo decision failed');
        throw error;
      }
    },

    erUpdateConfig: async (_, { input }, context) => {
      try {
        logger.info({
          tenantId: input.tenantId,
          userId: context.user?.id,
          config: input
        }, 'ER config update');

        await updateTenantConfig(input);
        return true;

      } catch (error) {
        logger.error({ error, input }, 'ER config update failed');
        throw error;
      }
    },

    erTriggerAutoMerge: async (_, { tenantId }, context) => {
      try {
        logger.info({
          tenantId,
          userId: context.user?.id
        }, 'ER auto-merge triggered');

        const result = await autoMergeService.processAutoMergeCandidates(tenantId);

        return {
          batchId: result.batch_id,
          processedCount: result.processed_count,
          successfulMerges: result.successful_merges,
          failedMerges: result.failed_merges,
          skippedMerges: result.skipped_merges,
          processingTimeMs: result.total_processing_time_ms
        };

      } catch (error) {
        logger.error({ error, tenantId }, 'ER auto-merge trigger failed');
        throw error;
      }
    }
  }
};

// Helper functions
async function getQueueCandidates(input: any): Promise<any[]> {
  let query = `
    SELECT c.*,
           EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - c.created_at))/60 as minutes_in_queue,
           CASE WHEN c.expires_at IS NOT NULL AND c.expires_at < CURRENT_TIMESTAMP THEN true ELSE false END as is_expired
    FROM er_candidates c
    WHERE c.tenant_id = $1 AND c.status = 'PENDING'
  `;

  const params = [input.tenantId];
  let paramIndex = 2;

  if (input.confidenceBand) {
    query += ` AND c.confidence_band = $${paramIndex}`;
    params.push(input.confidenceBand);
    paramIndex++;
  }

  if (input.entityType) {
    query += ` AND c.primary_entity_type = $${paramIndex}`;
    params.push(input.entityType);
    paramIndex++;
  }

  if (!input.includeExpired) {
    query += ` AND (c.expires_at IS NULL OR c.expires_at > CURRENT_TIMESTAMP)`;
  }

  // Add sorting
  switch (input.sortBy) {
    case 'CONFIDENCE_DESC':
      query += ' ORDER BY c.confidence_score DESC, c.created_at';
      break;
    case 'CONFIDENCE_ASC':
      query += ' ORDER BY c.confidence_score ASC, c.created_at';
      break;
    case 'CREATED_DESC':
      query += ' ORDER BY c.created_at DESC';
      break;
    case 'CREATED_ASC':
      query += ' ORDER BY c.created_at ASC';
      break;
    case 'PRIORITY_DESC':
      query += ' ORDER BY c.queue_priority DESC, c.confidence_score DESC';
      break;
    case 'EXPIRES_SOON':
      query += ' ORDER BY c.expires_at ASC NULLS LAST, c.confidence_score DESC';
      break;
    default:
      query += ' ORDER BY c.confidence_score DESC, c.created_at';
  }

  query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
  params.push(input.limit, input.offset);

  const result = await db.query(query, params);
  return result.rows.map(formatCandidate);
}

async function getQueueCount(input: any): Promise<number> {
  let query = `
    SELECT COUNT(*) as total
    FROM er_candidates c
    WHERE c.tenant_id = $1 AND c.status = 'PENDING'
  `;

  const params = [input.tenantId];
  let paramIndex = 2;

  if (input.confidenceBand) {
    query += ` AND c.confidence_band = $${paramIndex}`;
    params.push(input.confidenceBand);
    paramIndex++;
  }

  if (input.entityType) {
    query += ` AND c.primary_entity_type = $${paramIndex}`;
    params.push(input.entityType);
    paramIndex++;
  }

  if (!input.includeExpired) {
    query += ` AND (c.expires_at IS NULL OR c.expires_at > CURRENT_TIMESTAMP)`;
  }

  const result = await db.query(query, params);
  return parseInt(result.rows[0].total);
}

async function getCandidateById(id: string): Promise<any> {
  const query = `
    SELECT c.*,
           EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - c.created_at))/60 as minutes_in_queue,
           CASE WHEN c.expires_at IS NOT NULL AND c.expires_at < CURRENT_TIMESTAMP THEN true ELSE false END as is_expired
    FROM er_candidates c
    WHERE c.id = $1
  `;

  const result = await db.query(query, [id]);
  return result.rows[0] || null;
}

async function makeDecision(
  candidateId: string,
  decision: string,
  userId?: string,
  reason?: string,
  metadata?: any
): Promise<{ newStatus: string; mergeStats?: any }> {
  // Mock implementation - replace with actual decision processing
  const newStatus = decision === 'APPROVE' ? 'APPROVED' :
                   decision === 'REJECT' ? 'REJECTED' :
                   decision === 'UNDO' ? 'PENDING' : 'PENDING';

  // Update candidate status
  await db.query(
    'UPDATE er_candidates SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
    [newStatus, candidateId]
  );

  // Create decision record
  await db.query(
    `INSERT INTO er_decisions (candidate_id, decision, decided_by_user_id, decided_by_system, decision_reason, decision_metadata)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [candidateId, decision, userId, !userId, reason, metadata ? JSON.stringify(metadata) : null]
  );

  const result: any = { newStatus };

  // If approving, perform merge (mock stats)
  if (decision === 'APPROVE') {
    result.mergeStats = {
      mergedEntityId: `merged-${candidateId}`,
      propertiesMerged: 5,
      relationshipsTransferred: 3,
      neo4jStats: {
        nodesCreated: 0,
        nodesDeleted: 1,
        relationshipsCreated: 3,
        relationshipsDeleted: 3,
        propertiesSet: 5
      }
    };
  }

  return result;
}

function formatCandidate(row: any): any {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    primaryEntityId: row.primary_entity_id,
    primaryEntityType: row.primary_entity_type,
    primaryEntityData: typeof row.primary_entity_data === 'string'
      ? JSON.parse(row.primary_entity_data)
      : row.primary_entity_data,
    candidateEntityId: row.candidate_entity_id,
    candidateEntityType: row.candidate_entity_type,
    candidateEntityData: typeof row.candidate_entity_data === 'string'
      ? JSON.parse(row.candidate_entity_data)
      : row.candidate_entity_data,
    confidenceScore: parseFloat(row.confidence_score),
    confidenceBand: row.confidence_band,
    similarityFactors: typeof row.similarity_factors === 'string'
      ? JSON.parse(row.similarity_factors)
      : row.similarity_factors,
    status: row.status,
    queuePriority: parseInt(row.queue_priority),
    minutesInQueue: parseFloat(row.minutes_in_queue) || 0,
    expiresAt: row.expires_at,
    isExpired: row.is_expired || false,
    algorithmVersion: row.algorithm_version,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    decisions: [], // Would load from er_decisions table
    lastDecision: null
  };
}

function formatQueueStats(stats: any): any {
  return {
    totalPending: stats.total_pending,
    highConfidence: stats.high_confidence,
    midConfidence: stats.mid_confidence,
    lowConfidence: stats.low_confidence,
    avgQueueTimeHours: stats.avg_queue_time_hours,
    oldestCandidateAgeHours: stats.oldest_candidate_age_hours
  };
}

function formatSubmitResult(result: any): any {
  return {
    candidateId: result.candidate_id,
    status: result.status,
    confidenceScore: result.confidence_score,
    confidenceBand: result.confidence_band,
    autoMerged: result.auto_merged,
    reason: result.reason
  };
}

// Additional helper functions would be implemented for:
// - getDecisionStats
// - formatDecisionStats
// - formatAutoMergeStats
// - getConfidenceDistribution
// - formatConfidenceDistribution
// - getPerformanceMetrics
// - formatPerformanceMetrics
// - getTenantConfig
// - updateTenantConfig
// - getSimilarityFactors
// - formatSimilarityFactor

// Placeholder implementations
async function getDecisionStats(tenantId: string, days: number): Promise<any> {
  return {
    totalDecisions: 100,
    approvedCount: 60,
    rejectedCount: 30,
    softSplitCount: 10,
    undoCount: 5,
    approvalRate: 0.6,
    avgDecisionTimeMinutes: 15.5,
    decisionsByBand: []
  };
}

async function getConfidenceDistribution(tenantId: string, days: number): Promise<any> {
  return {
    high: 45,
    mid: 35,
    low: 20,
    avgScore: 0.78,
    scoreHistogram: []
  };
}

async function getPerformanceMetrics(tenantId: string, days: number): Promise<any> {
  return {
    avgProcessingTimeMs: 150,
    throughputPerHour: 24,
    queueEfficiency: 0.85,
    precisionEstimate: 0.92,
    recallEstimate: 0.87
  };
}

async function getTenantConfig(tenantId: string): Promise<any> {
  const query = `
    SELECT * FROM er_confidence_config WHERE tenant_id = $1
    UNION ALL
    SELECT * FROM er_confidence_config WHERE tenant_id = 'default'
    ORDER BY CASE WHEN tenant_id = $1 THEN 0 ELSE 1 END
    LIMIT 1
  `;

  const result = await db.query(query, [tenantId]);
  return result.rows[0] || {
    tenantId,
    highThreshold: 0.92,
    midThreshold: 0.75,
    autoMergeEnabled: true,
    autoMergeThreshold: 0.95,
    queueTtlHours: 168,
    maxQueueSize: 10000,
    algorithmVersion: 'similarity-v1.0'
  };
}

async function updateTenantConfig(input: any): Promise<void> {
  const query = `
    INSERT INTO er_confidence_config (
      tenant_id, high_threshold, mid_threshold, auto_merge_enabled,
      auto_merge_threshold, queue_ttl_hours, max_queue_size
    ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    ON CONFLICT (tenant_id) DO UPDATE SET
      high_threshold = EXCLUDED.high_threshold,
      mid_threshold = EXCLUDED.mid_threshold,
      auto_merge_enabled = EXCLUDED.auto_merge_enabled,
      auto_merge_threshold = EXCLUDED.auto_merge_threshold,
      queue_ttl_hours = EXCLUDED.queue_ttl_hours,
      max_queue_size = EXCLUDED.max_queue_size,
      updated_at = CURRENT_TIMESTAMP
  `;

  await db.query(query, [
    input.tenantId,
    input.highThreshold,
    input.midThreshold,
    input.autoMergeEnabled,
    input.autoMergeThreshold,
    input.queueTtlHours,
    input.maxQueueSize
  ]);
}

async function getSimilarityFactors(): Promise<any[]> {
  const query = 'SELECT * FROM er_similarity_factors WHERE enabled = true ORDER BY factor_name';
  const result = await db.query(query);
  return result.rows;
}

function formatSimilarityFactor(factor: any): any {
  return {
    name: factor.factor_name,
    type: factor.factor_type.toUpperCase(),
    weight: parseFloat(factor.factor_weight),
    applicableEntityTypes: factor.applicable_entity_types,
    enabled: factor.enabled,
    description: factor.description
  };
}

function formatDecisionStats(stats: any): any {
  return stats;
}

function formatAutoMergeStats(stats: any): any {
  return stats;
}

function formatConfidenceDistribution(dist: any): any {
  return dist;
}

function formatPerformanceMetrics(metrics: any): any {
  return metrics;
}