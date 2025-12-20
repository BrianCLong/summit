/**
 * Analytics endpoints: statistics, audit trail, decision ledger
 */

import { FastifyInstance } from 'fastify';
import { Pool } from 'pg';
import {
  type AuditEvent,
  type InterRaterAgreement,
  type DecisionLedgerEntry,
  type DecisionLedgerExport,
  type UserStats,
} from '../types/index.js';
import {
  calculateCohensKappa,
  calculateFleissKappa,
  calculatePercentAgreement,
  buildConfusionMatrix,
  calculateMean,
} from '../utils/statistics.js';
import {
  computeMerkleRoot,
  signData,
  generateExportId,
} from '../utils/crypto.js';

export async function registerAnalyticsRoutes(
  server: FastifyInstance,
  pool: Pool,
  servicePrivateKey: string,
) {
  // ========================================================================
  // Audit Trail Endpoints
  // ========================================================================

  // Get audit trail for a label
  server.get<{ Params: { labelId: string } }>(
    '/audit/label/:labelId',
    async (request: any, reply) => {
      try {
        const { labelId } = request.params;

        const result = await pool.query(
          'SELECT * FROM audit_events WHERE label_id = $1 ORDER BY timestamp ASC',
          [labelId],
        );

        const events: AuditEvent[] = result.rows.map((row) => ({
          id: row.id,
          eventType: row.event_type,
          userId: row.user_id,
          entityId: row.entity_id,
          labelId: row.label_id,
          reviewId: row.review_id,
          adjudicationId: row.adjudication_id,
          queueId: row.queue_id,
          beforeState: row.before_state,
          afterState: row.after_state,
          reasoning: row.reasoning,
          metadata: row.metadata,
          timestamp: row.timestamp,
          signature: row.signature,
          signatureAlgorithm: row.signature_algorithm,
          publicKey: row.public_key,
        }));

        return { labelId, events };
      } catch (error) {
        server.log.error(error, 'Failed to get audit trail');
        reply.status(500);
        return { error: 'Failed to retrieve audit trail' };
      }
    },
  );

  // Get audit trail for a user
  server.get<{ Params: { userId: string } }>(
    '/audit/user/:userId',
    async (request: any, reply) => {
      try {
        const { userId } = request.params;
        const { limit = 100, offset = 0 } = request.query as any;

        const result = await pool.query(
          'SELECT * FROM audit_events WHERE user_id = $1 ORDER BY timestamp DESC LIMIT $2 OFFSET $3',
          [userId, limit, offset],
        );

        const events: AuditEvent[] = result.rows.map((row) => ({
          id: row.id,
          eventType: row.event_type,
          userId: row.user_id,
          entityId: row.entity_id,
          labelId: row.label_id,
          reviewId: row.review_id,
          adjudicationId: row.adjudication_id,
          queueId: row.queue_id,
          beforeState: row.before_state,
          afterState: row.after_state,
          reasoning: row.reasoning,
          metadata: row.metadata,
          timestamp: row.timestamp,
          signature: row.signature,
          signatureAlgorithm: row.signature_algorithm,
          publicKey: row.public_key,
        }));

        return { userId, events, total: events.length, offset, limit };
      } catch (error) {
        server.log.error(error, 'Failed to get user audit trail');
        reply.status(500);
        return { error: 'Failed to retrieve user audit trail' };
      }
    },
  );

  // Verify audit event signature
  server.post<{ Body: { auditEventId: string } }>(
    '/audit/verify',
    async (request: any, reply) => {
      try {
        const { auditEventId } = request.body;

        const result = await pool.query(
          'SELECT * FROM audit_events WHERE id = $1',
          [auditEventId],
        );

        if (result.rows.length === 0) {
          reply.status(404);
          return { error: 'Audit event not found' };
        }

        const row = result.rows[0];

        const eventData = {
          id: row.id,
          eventType: row.event_type,
          userId: row.user_id,
          entityId: row.entity_id,
          labelId: row.label_id,
          reviewId: row.review_id,
          adjudicationId: row.adjudication_id,
          queueId: row.queue_id,
          beforeState: row.before_state,
          afterState: row.after_state,
          reasoning: row.reasoning,
          metadata: row.metadata,
          timestamp: row.timestamp,
        };

        const { verifySignature } = await import('../utils/crypto.js');
        const isValid = await verifySignature(
          eventData,
          row.signature,
          row.public_key,
        );

        return {
          auditEventId,
          valid: isValid,
          signature: row.signature,
          publicKey: row.public_key,
          verifiedAt: new Date().toISOString(),
        };
      } catch (error) {
        server.log.error(error, 'Failed to verify audit event');
        reply.status(500);
        return { error: 'Failed to verify audit event signature' };
      }
    },
  );

  // ========================================================================
  // Inter-Rater Agreement Statistics
  // ========================================================================

  // Calculate inter-rater agreement for a label type
  server.post<{
    Body: {
      labelType: string;
      entityType?: string;
      raterIds: string[];
      sampleSize?: number;
    };
  }>('/statistics/inter-rater-agreement', async (request: any, reply) => {
    try {
      const {
        labelType,
        entityType,
        raterIds,
        sampleSize = 100,
      } = request.body;

      if (raterIds.length < 2) {
        reply.status(400);
        return { error: 'At least 2 raters required' };
      }

      // Get labels for this label type from the specified raters
      let query = `
        SELECT l.entity_id, l.created_by as rater, l.label_value
        FROM labels l
        WHERE l.label_type = $1
          AND l.created_by = ANY($2)
          AND l.status IN ('approved', 'adjudicated')
      `;
      const params: any[] = [labelType, raterIds];

      if (entityType) {
        params.push(entityType);
        query += ` AND l.entity_type = $${params.length}`;
      }

      query += ` ORDER BY l.created_at DESC LIMIT $${params.length + 1}`;
      params.push(sampleSize * raterIds.length);

      const result = await pool.query(query, params);

      // Group by entity_id to get overlapping labels
      const entityRatings: Record<string, any[]> = {};
      for (const row of result.rows) {
        if (!entityRatings[row.entity_id]) {
          entityRatings[row.entity_id] = [];
        }
        entityRatings[row.entity_id].push({
          rater: row.rater,
          value: row.label_value,
        });
      }

      // Filter to entities with ratings from all raters
      const completeRatings = Object.entries(entityRatings).filter(
        ([_, ratings]) => {
          const raterSet = new Set(ratings.map((r) => r.rater));
          return raterIds.every((id) => raterSet.has(id));
        },
      );

      if (completeRatings.length < 2) {
        return {
          error: 'Insufficient overlapping ratings',
          message: 'Need at least 2 entities rated by all specified raters',
        };
      }

      // Build rating matrix
      const ratings: any[][] = completeRatings.map(([_, entityRatings]) => {
        return raterIds.map((raterId) => {
          const rating = entityRatings.find((r) => r.rater === raterId);
          return rating ? JSON.stringify(rating.value) : null;
        });
      });

      // Calculate statistics
      let cohensKappa: number | null = null;
      let fleissKappa: number | null = null;

      if (raterIds.length === 2) {
        // Cohen's Kappa for 2 raters
        const rater1Values = ratings.map((r) => r[0]);
        const rater2Values = ratings.map((r) => r[1]);
        cohensKappa = calculateCohensKappa(rater1Values, rater2Values);
      } else {
        // Fleiss' Kappa for multiple raters
        fleissKappa = calculateFleissKappa(ratings);
      }

      // Calculate percent agreement
      let totalAgreements = 0;
      let totalComparisons = 0;

      for (let i = 0; i < raterIds.length; i++) {
        for (let j = i + 1; j < raterIds.length; j++) {
          const rater1Values = ratings.map((r) => r[i]);
          const rater2Values = ratings.map((r) => r[j]);
          const pctAgree = calculatePercentAgreement(
            rater1Values,
            rater2Values,
          );
          totalAgreements += pctAgree;
          totalComparisons++;
        }
      }

      const percentAgreement =
        totalComparisons > 0 ? totalAgreements / totalComparisons : 0;

      // Build confusion matrix (for 2 raters only)
      let confusionMatrix: any = null;
      if (raterIds.length === 2) {
        const rater1Values = ratings.map((r) => r[0]);
        const rater2Values = ratings.map((r) => r[1]);
        confusionMatrix = buildConfusionMatrix(rater1Values, rater2Values);
      }

      const calculatedAt = new Date().toISOString();

      const agreement: InterRaterAgreement = {
        labelType,
        entityType,
        raters: raterIds,
        sampleSize: completeRatings.length,
        cohensKappa,
        fleissKappa,
        percentAgreement,
        confusionMatrix,
        calculatedAt,
        metadata: {
          totalEntitiesConsidered: Object.keys(entityRatings).length,
          entitiesWithCompleteRatings: completeRatings.length,
        },
      };

      // Cache the result
      await pool.query(
        `INSERT INTO inter_rater_agreements (
          label_type, entity_type, raters, sample_size,
          cohens_kappa, fleiss_kappa, percent_agreement,
          confusion_matrix, calculated_at, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          labelType,
          entityType,
          raterIds,
          completeRatings.length,
          cohensKappa,
          fleissKappa,
          percentAgreement,
          JSON.stringify(confusionMatrix),
          calculatedAt,
          JSON.stringify(agreement.metadata),
        ],
      );

      server.log.info(
        { labelType, raters: raterIds.length, sampleSize: completeRatings.length },
        'Inter-rater agreement calculated',
      );

      return agreement;
    } catch (error) {
      server.log.error(error, 'Failed to calculate inter-rater agreement');
      reply.status(500);
      return { error: 'Failed to calculate inter-rater agreement' };
    }
  });

  // Get user statistics
  server.get<{ Params: { userId: string } }>(
    '/statistics/user/:userId',
    async (request: any, reply) => {
      try {
        const { userId } = request.params;

        // Get total labels created
        const labelsResult = await pool.query(
          'SELECT COUNT(*) as count FROM labels WHERE created_by = $1',
          [userId],
        );
        const totalLabelsCreated = parseInt(labelsResult.rows[0].count);

        // Get total reviews
        const reviewsResult = await pool.query(
          'SELECT COUNT(*) as count, COUNT(*) FILTER (WHERE approved = true) as approved FROM reviews WHERE reviewer_id = $1',
          [userId],
        );
        const totalReviews = parseInt(reviewsResult.rows[0].count);
        const approvedReviews = parseInt(reviewsResult.rows[0].approved);
        const approvalRate =
          totalReviews > 0 ? (approvedReviews / totalReviews) * 100 : 0;

        // Get avg review time
        const timeResult = await pool.query(
          `SELECT EXTRACT(EPOCH FROM (r.created_at - l.created_at)) as review_time
          FROM reviews r
          JOIN labels l ON r.label_id = l.id
          WHERE r.reviewer_id = $1`,
          [userId],
        );
        const reviewTimes = timeResult.rows.map((row) =>
          parseFloat(row.review_time),
        );
        const avgReviewTime =
          reviewTimes.length > 0 ? calculateMean(reviewTimes) : 0;

        const userStats: UserStats = {
          userId,
          totalLabelsCreated,
          totalReviews,
          approvalRate,
          avgReviewTime,
          agreementScore: 0, // Placeholder - would need complex calculation
        };

        return userStats;
      } catch (error) {
        server.log.error(error, 'Failed to get user statistics');
        reply.status(500);
        return { error: 'Failed to retrieve user statistics' };
      }
    },
  );

  // ========================================================================
  // Decision Ledger
  // ========================================================================

  // Export decision ledger
  server.post<{
    Body: {
      filters?: {
        labelType?: string;
        entityType?: string;
        startDate?: string;
        endDate?: string;
      };
    };
  }>('/decision-ledger/export', async (request: any, reply) => {
    try {
      const { filters = {} } = request.body;

      let query = `
        SELECT
          l.*,
          array_agg(DISTINCT r.reviewer_id) FILTER (WHERE r.reviewer_id IS NOT NULL) as reviewers,
          a.resolved_by as adjudicator,
          array_agg(ae.id ORDER BY ae.timestamp) FILTER (WHERE ae.id IS NOT NULL) as audit_trail
        FROM labels l
        LEFT JOIN reviews r ON l.id = r.label_id
        LEFT JOIN adjudications a ON l.id = a.label_id
        LEFT JOIN audit_events ae ON l.id = ae.label_id
        WHERE l.status IN ('approved', 'adjudicated')
      `;
      const params: any[] = [];

      if (filters.labelType) {
        params.push(filters.labelType);
        query += ` AND l.label_type = $${params.length}`;
      }
      if (filters.entityType) {
        params.push(filters.entityType);
        query += ` AND l.entity_type = $${params.length}`;
      }
      if (filters.startDate) {
        params.push(filters.startDate);
        query += ` AND l.created_at >= $${params.length}`;
      }
      if (filters.endDate) {
        params.push(filters.endDate);
        query += ` AND l.created_at <= $${params.length}`;
      }

      query += ' GROUP BY l.id, a.resolved_by ORDER BY l.created_at DESC';

      const result = await pool.query(query, params);

      // Build ledger entries
      const entries: DecisionLedgerEntry[] = result.rows.map((row) => {
        const entry: DecisionLedgerEntry = {
          id: row.id,
          labelId: row.id,
          entityId: row.entity_id,
          entityType: row.entity_type,
          finalLabel: row.label_value,
          createdBy: row.created_by,
          reviewedBy: row.reviewers || [],
          adjudicatedBy: row.adjudicator,
          sourceEvidence: row.source_evidence,
          reasoning: row.reasoning,
          auditTrail: row.audit_trail || [],
          timestamp: row.created_at,
          signature: '', // Will be signed below
        };
        return entry;
      });

      // Sign each entry
      for (const entry of entries) {
        const signature = await signData(entry, servicePrivateKey);
        entry.signature = signature;

        // Store in decision_ledger table
        await pool.query(
          `INSERT INTO decision_ledger (
            id, label_id, entity_id, entity_type, final_label,
            created_by, reviewed_by, adjudicated_by, source_evidence,
            reasoning, audit_trail, timestamp, signature
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
          ON CONFLICT (id) DO UPDATE SET
            final_label = EXCLUDED.final_label,
            reviewed_by = EXCLUDED.reviewed_by,
            signature = EXCLUDED.signature`,
          [
            entry.id,
            entry.labelId,
            entry.entityId,
            entry.entityType,
            JSON.stringify(entry.finalLabel),
            entry.createdBy,
            entry.reviewedBy,
            entry.adjudicatedBy,
            entry.sourceEvidence,
            entry.reasoning,
            entry.auditTrail,
            entry.timestamp,
            entry.signature,
          ],
        );
      }

      // Compute merkle root
      const hashes = entries.map((e) => e.signature);
      const merkleRoot = computeMerkleRoot(hashes);

      const exportId = generateExportId();
      const exportedAt = new Date().toISOString();

      const exportData: DecisionLedgerExport = {
        exportId,
        entries,
        metadata: {
          exportedBy: request.userId,
          exportedAt,
          totalEntries: entries.length,
          filters,
        },
        signature: '', // Will be signed below
        merkleRoot,
      };

      // Sign the export
      exportData.signature = await signData(exportData, servicePrivateKey);

      server.log.info(
        { exportId, entries: entries.length, userId: request.userId },
        'Decision ledger exported',
      );

      return exportData;
    } catch (error) {
      server.log.error(error, 'Failed to export decision ledger');
      reply.status(500);
      return { error: 'Failed to export decision ledger' };
    }
  });
}
