import { IResolvers } from '@graphql-tools/utils';
import { getPostgresPool } from '../config/database';
import { getNeo4jDriver } from '../config/database';
import { HybridEntityResolutionService } from '../services/HybridEntityResolutionService';
import logger from '../config/logger';

const log = logger.child({ name: 'ERResolvers' });
const erService = new HybridEntityResolutionService();

// GA Core precision thresholds
const GA_PRECISION_THRESHOLDS = {
  PERSON: 0.9,
  ORG: 0.88,
  LOCATION: 0.85,
  ARTIFACT: 0.82,
};

export const erResolvers: IResolvers = {
  Query: {
    pendingMergeDecisions: async (
      _,
      { entityType, limit = 50, offset = 0 },
      context,
    ) => {
      const pool = getPostgresPool();

      let query = `
        SELECT * FROM merge_decisions 
        WHERE review_required = true
      `;
      const params: any[] = [];

      if (entityType) {
        query += ` AND entity_type = $${params.length + 1}`;
        params.push(entityType);
      }

      query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
      params.push(limit, offset);

      try {
        const result = await pool.query(query, params);
        return result.rows.map((row) => ({
          id: row.id,
          entityA: row.entity_a_id,
          entityB: row.entity_b_id,
          decision: row.decision,
          score: parseFloat(row.score),
          confidence: row.confidence ? parseFloat(row.confidence) : null,
          explanation: row.explanation,
          featureScores: row.feature_scores,
          modelVersion: row.model_version,
          method: row.method.toUpperCase(),
          riskScore: parseFloat(row.risk_score),
          reviewRequired: row.review_required,
          entityType: row.entity_type,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
          createdBy: row.created_by,
        }));
      } catch (error) {
        log.error(
          { error: error.message },
          'Failed to fetch pending merge decisions',
        );
        throw new Error('Failed to fetch pending merge decisions');
      }
    },

    mergeDecision: async (_, { id }, context) => {
      const pool = getPostgresPool();

      try {
        const result = await pool.query(
          'SELECT * FROM merge_decisions WHERE id = $1',
          [id],
        );

        if (result.rows.length === 0) {
          return null;
        }

        const row = result.rows[0];
        return {
          id: row.id,
          entityA: row.entity_a_id,
          entityB: row.entity_b_id,
          decision: row.decision,
          score: parseFloat(row.score),
          confidence: row.confidence ? parseFloat(row.confidence) : null,
          explanation: row.explanation,
          featureScores: row.feature_scores,
          modelVersion: row.model_version,
          method: row.method.toUpperCase(),
          riskScore: parseFloat(row.risk_score),
          reviewRequired: row.review_required,
          entityType: row.entity_type,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
          createdBy: row.created_by,
        };
      } catch (error) {
        log.error(
          { error: error.message, id },
          'Failed to fetch merge decision',
        );
        throw new Error('Failed to fetch merge decision');
      }
    },

    erPrecisionMetrics: async (_, { filter = {} }, context) => {
      const pool = getPostgresPool();

      try {
        let query = `
          SELECT 
            entity_type,
            total_decisions,
            merge_decisions,
            no_merge_decisions,
            uncertain_decisions,
            precision,
            avg_merge_confidence,
            avg_risk_score,
            reviews_required,
            model_version,
            last_updated
          FROM er_precision_metrics
          WHERE 1=1
        `;
        const params: any[] = [];

        if (filter.entityType) {
          query += ` AND entity_type = $${params.length + 1}`;
          params.push(filter.entityType);
        }

        if (filter.modelVersion) {
          query += ` AND model_version = $${params.length + 1}`;
          params.push(filter.modelVersion);
        }

        query += ' ORDER BY entity_type, last_updated DESC';

        const result = await pool.query(query, params);

        return result.rows.map((row) => ({
          entityType: row.entity_type,
          totalDecisions: row.total_decisions,
          mergeDecisions: row.merge_decisions,
          noMergeDecisions: row.no_merge_decisions,
          uncertainDecisions: row.uncertain_decisions,
          precision: parseFloat(row.precision),
          avgMergeConfidence: row.avg_merge_confidence
            ? parseFloat(row.avg_merge_confidence)
            : null,
          avgRiskScore: parseFloat(row.avg_risk_score),
          reviewsRequired: row.reviews_required,
          modelVersion: row.model_version,
          lastUpdated: row.last_updated,
        }));
      } catch (error) {
        log.error(
          { error: error.message, filter },
          'Failed to fetch ER precision metrics',
        );
        throw new Error('Failed to fetch ER precision metrics');
      }
    },

    erThresholdCheck: async (
      _,
      { entityType = 'PERSON', daysBack = 7 },
      context,
    ) => {
      const pool = getPostgresPool();

      try {
        const result = await pool.query(
          'SELECT check_ga_precision_threshold($1, $2) as result',
          [entityType, daysBack],
        );

        const data = result.rows[0].result;

        return {
          entityType: data.entity_type,
          currentPrecision: parseFloat(data.current_precision),
          threshold: parseFloat(data.threshold),
          meetsThreshold: data.meets_threshold,
          sampleSize: data.sample_size,
          daysEvaluated: data.days_evaluated,
          evaluatedAt: new Date(data.evaluated_at),
        };
      } catch (error) {
        log.error(
          { error: error.message, entityType, daysBack },
          'Failed to check ER threshold',
        );
        throw new Error('Failed to check ER threshold');
      }
    },

    erCIMetrics: async (_, { prNumber, commitSha, entityType }, context) => {
      const pool = getPostgresPool();

      let query = 'SELECT * FROM er_ci_metrics WHERE 1=1';
      const params: any[] = [];

      if (prNumber) {
        query += ` AND pr_number = $${params.length + 1}`;
        params.push(prNumber);
      }

      if (commitSha) {
        query += ` AND commit_sha = $${params.length + 1}`;
        params.push(commitSha);
      }

      if (entityType) {
        query += ` AND entity_type = $${params.length + 1}`;
        params.push(entityType);
      }

      query += ' ORDER BY created_at DESC LIMIT 100';

      try {
        const result = await pool.query(query, params);

        return result.rows.map((row) => ({
          id: row.id.toString(),
          prNumber: row.pr_number,
          commitSha: row.commit_sha,
          entityType: row.entity_type,
          precision: parseFloat(row.precision),
          sampleSize: row.sample_size,
          meetsThreshold: row.meets_threshold,
          threshold: parseFloat(row.threshold),
          createdAt: row.created_at,
        }));
      } catch (error) {
        log.error({ error: error.message }, 'Failed to fetch CI metrics');
        throw new Error('Failed to fetch CI metrics');
      }
    },

    resolveEntities: async (
      _,
      { entityA, entityB, entityType = 'PERSON' },
      context,
    ) => {
      try {
        const result = await erService.resolveEntitiesPair(
          entityA,
          entityB,
          entityType,
        );

        // Store the decision for audit and metrics
        const pool = getPostgresPool();
        const insertResult = await pool.query(
          `
          INSERT INTO merge_decisions (
            entity_a_id, entity_b_id, decision, score, confidence, explanation,
            feature_scores, model_version, method, risk_score, review_required,
            entity_type, created_by
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
          RETURNING id
        `,
          [
            JSON.stringify(entityA),
            JSON.stringify(entityB),
            result.match ? 'MERGE' : 'NO_MERGE',
            result.score,
            result.confidence || result.score,
            result.explanation,
            result.explanation, // feature_scores (same as explanation for now)
            result.version || 'hybrid-v2.0',
            result.method || 'hybrid',
            result.riskScore || 1.0 - (result.confidence || result.score),
            (result.riskScore || 0) > 0.3,
            entityType,
            context.user?.id || 'system',
          ],
        );

        return {
          id: insertResult.rows[0].id,
          entityA: JSON.stringify(entityA),
          entityB: JSON.stringify(entityB),
          decision: result.match ? 'MERGE' : 'NO_MERGE',
          score: result.score,
          confidence: result.confidence || result.score,
          explanation: result.explanation,
          featureScores: result.explanation,
          modelVersion: result.version || 'hybrid-v2.0',
          method: (result.method || 'hybrid').toUpperCase(),
          riskScore:
            result.riskScore || 1.0 - (result.confidence || result.score),
          reviewRequired: (result.riskScore || 0) > 0.3,
          entityType,
          createdAt: new Date(),
          updatedAt: null,
          createdBy: context.user?.id || 'system',
        };
      } catch (error) {
        log.error(
          { error: error.message, entityA, entityB },
          'Failed to resolve entities',
        );
        throw new Error('Failed to resolve entities: ' + error.message);
      }
    },
  },

  Mutation: {
    decideMerge: async (_, { input }, context) => {
      const session = getNeo4jDriver().session();

      try {
        // Get actual entities from Neo4j
        const entityResult = await session.run(
          `
          MATCH (a:Entity) WHERE a.id = $entityA OR a.uuid = $entityA
          MATCH (b:Entity) WHERE b.id = $entityB OR b.uuid = $entityB  
          RETURN a, b
        `,
          { entityA: input.entityA, entityB: input.entityB },
        );

        if (entityResult.records.length === 0) {
          throw new Error('One or both entities not found');
        }

        const entityAProps = entityResult.records[0].get('a').properties;
        const entityBProps = entityResult.records[0].get('b').properties;

        // Process merge decision using hybrid service
        const decision = await erService.processMergeDecision(
          session,
          input.entityA,
          input.entityB,
          input.entityType,
        );

        // If decision is to merge and not forced for review, execute the merge
        if (
          decision.decision === 'MERGE' &&
          !input.forceReview &&
          !decision.reviewRequired
        ) {
          await erService.mergeEntities(session, input.entityA, [
            input.entityB,
          ]);
          log.info({ decisionId: decision.id }, 'Entities merged successfully');
        }

        return {
          id: decision.id,
          entityA: decision.entityA,
          entityB: decision.entityB,
          decision: decision.decision,
          score: decision.score,
          confidence: decision.score, // Use score as confidence for now
          explanation: decision.explanation,
          featureScores: decision.explanation,
          modelVersion: 'hybrid-v2.0',
          method: decision.method.toUpperCase(),
          riskScore: decision.riskScore,
          reviewRequired: decision.reviewRequired || input.forceReview,
          entityType: input.entityType,
          createdAt: decision.createdAt,
          updatedAt: null,
          createdBy: context.user?.id || 'system',
        };
      } catch (error) {
        log.error({ error: error.message, input }, 'Failed to decide merge');
        throw new Error('Failed to decide merge: ' + error.message);
      } finally {
        await session.close();
      }
    },

    recordERCIMetric: async (
      _,
      { prNumber, commitSha, entityType, precision, sampleSize, threshold },
      context,
    ) => {
      const pool = getPostgresPool();

      try {
        const result = await pool.query(
          `
          INSERT INTO er_ci_metrics (
            pr_number, commit_sha, entity_type, precision, sample_size, 
            meets_threshold, threshold
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT (pr_number, commit_sha, entity_type) 
          DO UPDATE SET 
            precision = EXCLUDED.precision,
            sample_size = EXCLUDED.sample_size,
            meets_threshold = EXCLUDED.meets_threshold,
            threshold = EXCLUDED.threshold,
            created_at = NOW()
          RETURNING *
        `,
          [
            prNumber,
            commitSha,
            entityType,
            precision,
            sampleSize,
            precision >= threshold,
            threshold,
          ],
        );

        const row = result.rows[0];

        return {
          id: row.id.toString(),
          prNumber: row.pr_number,
          commitSha: row.commit_sha,
          entityType: row.entity_type,
          precision: parseFloat(row.precision),
          sampleSize: row.sample_size,
          meetsThreshold: row.meets_threshold,
          threshold: parseFloat(row.threshold),
          createdAt: row.created_at,
        };
      } catch (error) {
        log.error({ error: error.message }, 'Failed to record CI metric');
        throw new Error('Failed to record CI metric');
      }
    },
  },
};
