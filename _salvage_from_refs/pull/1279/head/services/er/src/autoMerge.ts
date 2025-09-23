/**
 * Auto-Merge Service for High Confidence ER Candidates
 *
 * Automatically processes high-confidence entity resolution candidates,
 * performs merges in Neo4j, and maintains audit trails.
 */

import { Pool } from 'pg';
import neo4j, { Driver, Session } from 'neo4j-driver';
import pino from 'pino';
import { z } from 'zod';

import { businessMetrics } from '../../gateway/src/observability/telemetry';

const logger = pino({ name: 'er-auto-merge' });

// Configuration
export const AutoMergeConfigSchema = z.object({
  enabled: z.boolean().default(true),
  confidence_threshold: z.number().min(0).max(1).default(0.95),
  batch_size: z.number().min(1).max(1000).default(100),
  max_processing_time_ms: z.number().min(1000).max(300000).default(60000),
  dry_run: z.boolean().default(false),
  preserve_properties: z.array(z.string()).default(['created_at', 'source_system']),
  conflict_resolution: z.enum(['prefer_primary', 'prefer_newer', 'merge_all']).default('prefer_primary')
});

export type AutoMergeConfig = z.infer<typeof AutoMergeConfigSchema>;

// Result types
export interface MergeResult {
  candidate_id: string;
  primary_entity_id: string;
  candidate_entity_id: string;
  merged_entity_id: string;
  status: 'SUCCESS' | 'FAILED' | 'SKIPPED';
  reason?: string;
  properties_merged: number;
  relationships_transferred: number;
  processing_time_ms: number;
  neo4j_stats: {
    nodes_created: number;
    nodes_deleted: number;
    relationships_created: number;
    relationships_deleted: number;
    properties_set: number;
  };
}

export interface AutoMergeBatchResult {
  batch_id: string;
  tenant_id: string;
  processed_count: number;
  successful_merges: number;
  failed_merges: number;
  skipped_merges: number;
  total_processing_time_ms: number;
  results: MergeResult[];
}

/**
 * Auto-Merge Service
 */
export class AutoMergeService {
  private db: Pool;
  private neo4jDriver: Driver;
  private config: AutoMergeConfig;

  constructor(
    db: Pool,
    neo4jDriver: Driver,
    config: Partial<AutoMergeConfig> = {}
  ) {
    this.db = db;
    this.neo4jDriver = neo4jDriver;
    this.config = AutoMergeConfigSchema.parse(config);

    logger.info('Auto-merge service initialized', { config: this.config });
  }

  /**
   * Process high-confidence candidates for auto-merging
   */
  async processAutoMergeCandidates(tenant_id: string): Promise<AutoMergeBatchResult> {
    const batch_id = `auto-merge-${Date.now()}`;
    const start_time = Date.now();

    try {
      logger.info({
        batch_id,
        tenant_id,
        threshold: this.config.confidence_threshold
      }, 'Starting auto-merge batch processing');

      if (!this.config.enabled) {
        logger.info('Auto-merge is disabled');
        return {
          batch_id,
          tenant_id,
          processed_count: 0,
          successful_merges: 0,
          failed_merges: 0,
          skipped_merges: 0,
          total_processing_time_ms: Date.now() - start_time,
          results: []
        };
      }

      // Get high-confidence candidates ready for auto-merge
      const candidates = await this.getAutoMergeCandidates(tenant_id);

      if (candidates.length === 0) {
        logger.info({ tenant_id }, 'No candidates found for auto-merge');
        return {
          batch_id,
          tenant_id,
          processed_count: 0,
          successful_merges: 0,
          failed_merges: 0,
          skipped_merges: 0,
          total_processing_time_ms: Date.now() - start_time,
          results: []
        };
      }

      logger.info({
        batch_id,
        tenant_id,
        candidate_count: candidates.length
      }, 'Processing auto-merge candidates');

      // Process candidates in batches
      const results: MergeResult[] = [];
      let successful_merges = 0;
      let failed_merges = 0;
      let skipped_merges = 0;

      for (const candidate of candidates) {
        try {
          const mergeResult = await this.mergeCandidatePair(candidate, batch_id);
          results.push(mergeResult);

          switch (mergeResult.status) {
            case 'SUCCESS':
              successful_merges++;
              break;
            case 'FAILED':
              failed_merges++;
              break;
            case 'SKIPPED':
              skipped_merges++;
              break;
          }

          // Check timeout
          if (Date.now() - start_time > this.config.max_processing_time_ms) {
            logger.warn({
              batch_id,
              processed: results.length,
              remaining: candidates.length - results.length
            }, 'Auto-merge batch timeout reached');
            break;
          }

        } catch (error) {
          logger.error({
            batch_id,
            candidate_id: candidate.id,
            error: error.message
          }, 'Auto-merge candidate processing failed');

          results.push({
            candidate_id: candidate.id,
            primary_entity_id: candidate.primary_entity_id,
            candidate_entity_id: candidate.candidate_entity_id,
            merged_entity_id: candidate.primary_entity_id,
            status: 'FAILED',
            reason: `Processing error: ${error.message}`,
            properties_merged: 0,
            relationships_transferred: 0,
            processing_time_ms: 0,
            neo4j_stats: {
              nodes_created: 0,
              nodes_deleted: 0,
              relationships_created: 0,
              relationships_deleted: 0,
              properties_set: 0
            }
          });

          failed_merges++;
        }
      }

      const total_processing_time_ms = Date.now() - start_time;

      // Track metrics
      businessMetrics.erAutoMergeTotal.add(successful_merges, {
        tenant_id,
        batch_id
      });

      const batchResult: AutoMergeBatchResult = {
        batch_id,
        tenant_id,
        processed_count: results.length,
        successful_merges,
        failed_merges,
        skipped_merges,
        total_processing_time_ms,
        results
      };

      logger.info({
        batch_id,
        ...batchResult
      }, 'Auto-merge batch processing completed');

      return batchResult;

    } catch (error) {
      logger.error({
        batch_id,
        tenant_id,
        error: error.message
      }, 'Auto-merge batch processing failed');

      throw new Error(`Auto-merge batch failed: ${error.message}`);
    }
  }

  /**
   * Merge a specific candidate pair
   */
  async mergeCandidatePair(
    candidate: any,
    batch_id: string
  ): Promise<MergeResult> {
    const start_time = Date.now();

    try {
      logger.debug({
        candidate_id: candidate.id,
        primary_entity_id: candidate.primary_entity_id,
        candidate_entity_id: candidate.candidate_entity_id,
        confidence_score: candidate.confidence_score
      }, 'Processing candidate pair merge');

      // Validate confidence threshold
      if (candidate.confidence_score < this.config.confidence_threshold) {
        return {
          candidate_id: candidate.id,
          primary_entity_id: candidate.primary_entity_id,
          candidate_entity_id: candidate.candidate_entity_id,
          merged_entity_id: candidate.primary_entity_id,
          status: 'SKIPPED',
          reason: `Confidence ${candidate.confidence_score} below threshold ${this.config.confidence_threshold}`,
          properties_merged: 0,
          relationships_transferred: 0,
          processing_time_ms: Date.now() - start_time,
          neo4j_stats: {
            nodes_created: 0,
            nodes_deleted: 0,
            relationships_created: 0,
            relationships_deleted: 0,
            properties_set: 0
          }
        };
      }

      // Perform merge in Neo4j
      const mergeStats = await this.performNeo4jMerge(
        candidate.primary_entity_id,
        candidate.candidate_entity_id,
        candidate.primary_entity_type,
        candidate.similarity_factors
      );

      if (!this.config.dry_run) {
        // Update candidate status
        await this.updateCandidateStatus(candidate.id, 'AUTO_MERGED');

        // Create decision record
        await this.createDecisionRecord(candidate.id, {
          decision: 'APPROVE',
          decided_by_system: true,
          decision_reason: `Auto-merged: confidence ${candidate.confidence_score} >= ${this.config.confidence_threshold}`,
          decision_metadata: {
            batch_id,
            merge_stats: mergeStats,
            auto_merge: true
          }
        });
      }

      const processing_time_ms = Date.now() - start_time;

      return {
        candidate_id: candidate.id,
        primary_entity_id: candidate.primary_entity_id,
        candidate_entity_id: candidate.candidate_entity_id,
        merged_entity_id: candidate.primary_entity_id,
        status: 'SUCCESS',
        properties_merged: mergeStats.properties_set,
        relationships_transferred: mergeStats.relationships_created,
        processing_time_ms,
        neo4j_stats: mergeStats
      };

    } catch (error) {
      const processing_time_ms = Date.now() - start_time;

      logger.error({
        candidate_id: candidate.id,
        error: error.message,
        processing_time_ms
      }, 'Candidate merge failed');

      return {
        candidate_id: candidate.id,
        primary_entity_id: candidate.primary_entity_id,
        candidate_entity_id: candidate.candidate_entity_id,
        merged_entity_id: candidate.primary_entity_id,
        status: 'FAILED',
        reason: error.message,
        properties_merged: 0,
        relationships_transferred: 0,
        processing_time_ms,
        neo4j_stats: {
          nodes_created: 0,
          nodes_deleted: 0,
          relationships_created: 0,
          relationships_deleted: 0,
          properties_set: 0
        }
      };
    }
  }

  /**
   * Get auto-merge candidates from database
   */
  private async getAutoMergeCandidates(tenant_id: string): Promise<any[]> {
    const query = `
      SELECT id, tenant_id, primary_entity_id, primary_entity_type,
             primary_entity_data, candidate_entity_id, candidate_entity_type,
             candidate_entity_data, confidence_score, confidence_band,
             similarity_factors, created_at
      FROM er_candidates
      WHERE tenant_id = $1
        AND status = 'PENDING'
        AND confidence_score >= $2
        AND confidence_band = 'HIGH'
        AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
      ORDER BY confidence_score DESC, created_at
      LIMIT $3
    `;

    const result = await this.db.query(query, [
      tenant_id,
      this.config.confidence_threshold,
      this.config.batch_size
    ]);

    return result.rows.map(row => ({
      ...row,
      primary_entity_data: JSON.parse(row.primary_entity_data),
      candidate_entity_data: JSON.parse(row.candidate_entity_data),
      similarity_factors: JSON.parse(row.similarity_factors)
    }));
  }

  /**
   * Perform entity merge in Neo4j
   */
  private async performNeo4jMerge(
    primaryEntityId: string,
    candidateEntityId: string,
    entityType: string,
    similarityFactors: Record<string, number>
  ): Promise<{
    nodes_created: number;
    nodes_deleted: number;
    relationships_created: number;
    relationships_deleted: number;
    properties_set: number;
  }> {
    const session = this.neo4jDriver.session();

    try {
      const mergeQuery = `
        // Find both nodes
        MATCH (primary:${entityType} {id: $primaryId})
        MATCH (candidate:${entityType} {id: $candidateId})

        // Merge properties based on conflict resolution strategy
        WITH primary, candidate,
             CASE
               WHEN $conflictResolution = 'prefer_primary' THEN candidate + primary
               WHEN $conflictResolution = 'prefer_newer' THEN
                 CASE
                   WHEN candidate.updated_at > primary.updated_at THEN primary + candidate
                   ELSE candidate + primary
                 END
               ELSE primary + candidate
             END AS mergedProps

        // Set merged properties on primary node
        SET primary += mergedProps

        // Add merge metadata
        SET primary.er_merged_from = COALESCE(primary.er_merged_from, []) + [$candidateId]
        SET primary.er_merge_confidence = $confidence
        SET primary.er_last_merge = datetime()

        // Transfer all relationships from candidate to primary
        WITH primary, candidate
        OPTIONAL MATCH (candidate)-[r]-(other)
        WHERE other <> primary
        WITH primary, candidate, r, other, type(r) as relType, startNode(r) as startN, endNode(r) as endN

        // Create new relationships from primary
        FOREACH (ignore IN CASE WHEN startN = candidate THEN [1] ELSE [] END |
          MERGE (primary)-[newR:${entityType === 'Person' ? 'RELATED_TO' : 'CONNECTED_TO'}]-(other)
          SET newR += properties(r)
        )
        FOREACH (ignore IN CASE WHEN endN = candidate THEN [1] ELSE [] END |
          MERGE (other)-[newR:${entityType === 'Person' ? 'RELATED_TO' : 'CONNECTED_TO'}]-(primary)
          SET newR += properties(r)
        )

        // Delete candidate relationships and node
        WITH primary, candidate, collect(r) as rels
        FOREACH (rel IN rels | DELETE rel)
        DELETE candidate

        RETURN primary.id as merged_id
      `;

      if (this.config.dry_run) {
        logger.info({
          primaryEntityId,
          candidateEntityId,
          entityType
        }, 'Dry run: would merge entities');

        return {
          nodes_created: 0,
          nodes_deleted: 1,
          relationships_created: 0,
          relationships_deleted: 0,
          properties_set: 0
        };
      }

      const result = await session.run(mergeQuery, {
        primaryId: primaryEntityId,
        candidateId: candidateEntityId,
        conflictResolution: this.config.conflict_resolution,
        confidence: Math.max(...Object.values(similarityFactors))
      });

      const summary = result.summary;
      const stats = summary.counters.updates();

      return {
        nodes_created: stats.nodesCreated,
        nodes_deleted: stats.nodesDeleted,
        relationships_created: stats.relationshipsCreated,
        relationships_deleted: stats.relationshipsDeleted,
        properties_set: stats.propertiesSet
      };

    } finally {
      await session.close();
    }
  }

  /**
   * Update candidate status in database
   */
  private async updateCandidateStatus(candidateId: string, status: string): Promise<void> {
    const query = `
      UPDATE er_candidates
      SET status = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `;

    await this.db.query(query, [status, candidateId]);
  }

  /**
   * Create decision record
   */
  private async createDecisionRecord(
    candidateId: string,
    options: {
      decision: string;
      decided_by_system: boolean;
      decided_by_user_id?: string;
      decision_reason?: string;
      decision_metadata?: Record<string, any>;
    }
  ): Promise<void> {
    const query = `
      INSERT INTO er_decisions (
        candidate_id, decision, decided_by_system, decided_by_user_id,
        decision_reason, decision_metadata
      ) VALUES ($1, $2, $3, $4, $5, $6)
    `;

    await this.db.query(query, [
      candidateId,
      options.decision,
      options.decided_by_system,
      options.decided_by_user_id || null,
      options.decision_reason || null,
      options.decision_metadata ? JSON.stringify(options.decision_metadata) : null
    ]);
  }

  /**
   * Get auto-merge statistics
   */
  async getAutoMergeStats(
    tenant_id: string,
    days: number = 7
  ): Promise<{
    total_auto_merges: number;
    avg_confidence: number;
    success_rate: number;
    avg_processing_time_ms: number;
    daily_counts: Array<{ date: string; count: number }>;
  }> {
    const query = `
      SELECT
        COUNT(*) as total_auto_merges,
        AVG(c.confidence_score) as avg_confidence,
        COUNT(*) FILTER (WHERE d.decision = 'APPROVE') * 100.0 / COUNT(*) as success_rate,
        AVG(EXTRACT(EPOCH FROM (d.decided_at - c.created_at)) * 1000) as avg_processing_time_ms,
        DATE(d.decided_at) as decision_date,
        COUNT(*) as daily_count
      FROM er_candidates c
      JOIN er_decisions d ON c.id = d.candidate_id
      WHERE c.tenant_id = $1
        AND d.decided_by_system = true
        AND d.decided_at >= CURRENT_DATE - INTERVAL '%s days'
      GROUP BY DATE(d.decided_at)
      ORDER BY decision_date DESC
    `;

    const result = await this.db.query(query, [tenant_id, days]);

    const dailyCounts = result.rows.map(row => ({
      date: row.decision_date,
      count: parseInt(row.daily_count)
    }));

    const totals = result.rows.reduce(
      (acc, row) => ({
        total_auto_merges: acc.total_auto_merges + parseInt(row.daily_count),
        avg_confidence: acc.avg_confidence + parseFloat(row.avg_confidence || 0),
        success_rate: acc.success_rate + parseFloat(row.success_rate || 0),
        avg_processing_time_ms: acc.avg_processing_time_ms + parseFloat(row.avg_processing_time_ms || 0)
      }),
      { total_auto_merges: 0, avg_confidence: 0, success_rate: 0, avg_processing_time_ms: 0 }
    );

    const rowCount = result.rows.length || 1;

    return {
      total_auto_merges: totals.total_auto_merges,
      avg_confidence: totals.avg_confidence / rowCount,
      success_rate: totals.success_rate / rowCount,
      avg_processing_time_ms: totals.avg_processing_time_ms / rowCount,
      daily_counts: dailyCounts
    };
  }
}