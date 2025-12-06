/**
 * Entity Resolution Service
 * Deterministic + probabilistic ER with explainable scorecards,
 * reversible merges, and H2L adjudication queues.
 */

import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import { z } from 'zod';
import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';

const PORT = parseInt(process.env.PORT || '4020');
const NODE_ENV = process.env.NODE_ENV || 'development';

// Database connection
const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ||
    'postgres://postgres:postgres@localhost:5432/entity_resolution',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// ============================================================================
// Zod Schemas
// ============================================================================

const EntityFacetSchema = z.object({
  '@context': z.string().optional().default('https://schema.org'),
  '@type': z.string(),
  '@id': z.string().optional(),
  name: z.string().optional(),
  identifier: z.array(z.object({
    '@type': z.string().default('PropertyValue'),
    propertyID: z.string(),
    value: z.string(),
  })).optional(),
  additionalProperties: z.record(z.any()).optional(),
});

const CreateEntitySchema = z.object({
  facets: EntityFacetSchema,
  sourceRef: z.string(),
  confidence: z.number().min(0).max(1).default(1.0),
  policyLabels: z.array(z.string()).optional(),
});

const FeatureVectorSchema = z.object({
  nameMatch: z.number().min(0).max(1),
  identifierMatch: z.number().min(0).max(1),
  attributeOverlap: z.number().min(0).max(1),
  temporalProximity: z.number().min(0).max(1),
  sourceAgreement: z.number().min(0).max(1),
  transitiveSupport: z.number().min(0).max(1),
});

const MergeRequestSchema = z.object({
  sourceEntityId: z.string(),
  targetEntityId: z.string(),
  reason: z.string(),
  override: z.boolean().default(false),
});

const SplitRequestSchema = z.object({
  entityId: z.string(),
  facetIds: z.array(z.string()),
  reason: z.string(),
});

// ============================================================================
// Types
// ============================================================================

interface Entity {
  id: string;
  canonicalFacets: z.infer<typeof EntityFacetSchema>;
  sourceRefs: string[];
  mergeHistory: MergeEvent[];
  created_at: string;
  updated_at: string;
  policyLabels: string[];
}

interface MergeEvent {
  id: string;
  timestamp: string;
  sourceEntityId: string;
  targetEntityId: string;
  mergedBy: string;
  reason: string;
  reversible: boolean;
  featureVector: z.infer<typeof FeatureVectorSchema>;
}

interface MatchCandidate {
  entityId: string;
  score: number;
  featureVector: z.infer<typeof FeatureVectorSchema>;
  explanation: string[];
  requiresAdjudication: boolean;
}

interface Scorecard {
  candidateId: string;
  referenceId: string;
  featureVector: z.infer<typeof FeatureVectorSchema>;
  overallScore: number;
  confidence: number;
  matchDecision: 'MATCH' | 'NO_MATCH' | 'REVIEW';
  explanation: ScoreExplanation[];
}

interface ScoreExplanation {
  feature: string;
  weight: number;
  score: number;
  contribution: number;
  rationale: string;
}

interface AdjudicationQueueItem {
  id: string;
  entityAId: string;
  entityBId: string;
  scorecard: Scorecard;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  assignedTo?: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'RESOLVED';
  created_at: string;
}

// ============================================================================
// Matching Engine
// ============================================================================

class EntityMatcher {
  private weights = {
    nameMatch: 0.25,
    identifierMatch: 0.30,
    attributeOverlap: 0.15,
    temporalProximity: 0.10,
    sourceAgreement: 0.10,
    transitiveSupport: 0.10,
  };

  async computeFeatureVector(
    entityA: Entity,
    entityB: Entity,
  ): Promise<z.infer<typeof FeatureVectorSchema>> {
    const facetsA = entityA.canonicalFacets;
    const facetsB = entityB.canonicalFacets;

    return {
      nameMatch: this.computeNameSimilarity(facetsA.name, facetsB.name),
      identifierMatch: this.computeIdentifierMatch(
        facetsA.identifier || [],
        facetsB.identifier || [],
      ),
      attributeOverlap: this.computeAttributeOverlap(facetsA, facetsB),
      temporalProximity: this.computeTemporalProximity(entityA, entityB),
      sourceAgreement: this.computeSourceAgreement(
        entityA.sourceRefs,
        entityB.sourceRefs,
      ),
      transitiveSupport: 0, // Computed separately with graph context
    };
  }

  computeOverallScore(featureVector: z.infer<typeof FeatureVectorSchema>): number {
    let score = 0;
    for (const [feature, weight] of Object.entries(this.weights)) {
      score += (featureVector as any)[feature] * weight;
    }
    return Math.min(1, Math.max(0, score));
  }

  generateScorecard(
    entityA: Entity,
    entityB: Entity,
    featureVector: z.infer<typeof FeatureVectorSchema>,
  ): Scorecard {
    const overallScore = this.computeOverallScore(featureVector);
    const explanations: ScoreExplanation[] = [];

    for (const [feature, weight] of Object.entries(this.weights)) {
      const score = (featureVector as any)[feature];
      explanations.push({
        feature,
        weight,
        score,
        contribution: score * weight,
        rationale: this.explainFeature(feature, score, entityA, entityB),
      });
    }

    // Determine match decision
    let matchDecision: 'MATCH' | 'NO_MATCH' | 'REVIEW';
    if (overallScore >= 0.85) {
      matchDecision = 'MATCH';
    } else if (overallScore <= 0.4) {
      matchDecision = 'NO_MATCH';
    } else {
      matchDecision = 'REVIEW';
    }

    return {
      candidateId: entityA.id,
      referenceId: entityB.id,
      featureVector,
      overallScore,
      confidence: this.computeConfidence(featureVector),
      matchDecision,
      explanation: explanations,
    };
  }

  private computeNameSimilarity(nameA?: string, nameB?: string): number {
    if (!nameA || !nameB) return 0;

    const a = nameA.toLowerCase().trim();
    const b = nameB.toLowerCase().trim();

    if (a === b) return 1;

    // Levenshtein-based similarity
    const maxLen = Math.max(a.length, b.length);
    if (maxLen === 0) return 1;

    const distance = this.levenshteinDistance(a, b);
    return 1 - (distance / maxLen);
  }

  private computeIdentifierMatch(
    idsA: Array<{ propertyID: string; value: string }>,
    idsB: Array<{ propertyID: string; value: string }>,
  ): number {
    if (idsA.length === 0 || idsB.length === 0) return 0;

    let matches = 0;
    for (const idA of idsA) {
      for (const idB of idsB) {
        if (idA.propertyID === idB.propertyID && idA.value === idB.value) {
          matches++;
        }
      }
    }

    const maxPossible = Math.max(idsA.length, idsB.length);
    return matches / maxPossible;
  }

  private computeAttributeOverlap(
    facetsA: z.infer<typeof EntityFacetSchema>,
    facetsB: z.infer<typeof EntityFacetSchema>,
  ): number {
    const propsA = facetsA.additionalProperties || {};
    const propsB = facetsB.additionalProperties || {};

    const keysA = new Set(Object.keys(propsA));
    const keysB = new Set(Object.keys(propsB));

    const intersection = [...keysA].filter((k) => keysB.has(k));
    const union = new Set([...keysA, ...keysB]);

    if (union.size === 0) return 0;

    // Jaccard similarity for keys, plus value matching
    let valueMatches = 0;
    for (const key of intersection) {
      if (JSON.stringify(propsA[key]) === JSON.stringify(propsB[key])) {
        valueMatches++;
      }
    }

    return (intersection.length + valueMatches) / (union.size * 2);
  }

  private computeTemporalProximity(entityA: Entity, entityB: Entity): number {
    const timeA = new Date(entityA.created_at).getTime();
    const timeB = new Date(entityB.created_at).getTime();

    const diffHours = Math.abs(timeA - timeB) / (1000 * 60 * 60);

    // Decay function: 1 for same time, 0.5 at 24 hours, approaching 0 at infinity
    return Math.exp(-diffHours / 48);
  }

  private computeSourceAgreement(sourcesA: string[], sourcesB: string[]): number {
    if (sourcesA.length === 0 || sourcesB.length === 0) return 0;

    const setA = new Set(sourcesA);
    const setB = new Set(sourcesB);

    const intersection = [...setA].filter((s) => setB.has(s));
    const union = new Set([...setA, ...setB]);

    return intersection.length / union.size;
  }

  private computeConfidence(featureVector: z.infer<typeof FeatureVectorSchema>): number {
    // Higher confidence when multiple strong signals agree
    const strongSignals = Object.values(featureVector).filter((v) => v >= 0.8);
    const signalStrength = strongSignals.reduce((a, b) => a + b, 0) / Object.keys(featureVector).length;

    // Penalize conflicting signals
    const variance = this.computeVariance(Object.values(featureVector));

    return Math.min(1, Math.max(0, signalStrength * (1 - variance)));
  }

  private computeVariance(values: number[]): number {
    if (values.length === 0) return 0;
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const squaredDiffs = values.map((v) => Math.pow(v - mean, 2));
    return squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
  }

  private explainFeature(
    feature: string,
    score: number,
    entityA: Entity,
    entityB: Entity,
  ): string {
    const strength = score >= 0.8 ? 'strong' : score >= 0.5 ? 'moderate' : 'weak';

    switch (feature) {
      case 'nameMatch':
        return `${strength} name similarity (${(score * 100).toFixed(0)}%) between "${entityA.canonicalFacets.name}" and "${entityB.canonicalFacets.name}"`;
      case 'identifierMatch':
        return `${strength} identifier overlap (${(score * 100).toFixed(0)}% of identifiers match)`;
      case 'attributeOverlap':
        return `${strength} attribute agreement (${(score * 100).toFixed(0)}% overlap)`;
      case 'temporalProximity':
        return `${strength} temporal proximity (records created ${score >= 0.8 ? 'close together' : 'far apart'})`;
      case 'sourceAgreement':
        return `${strength} source agreement (${(score * 100).toFixed(0)}% shared sources)`;
      case 'transitiveSupport':
        return `${strength} transitive support from graph relationships`;
      default:
        return `${feature}: ${(score * 100).toFixed(0)}%`;
    }
  }

  private levenshteinDistance(a: string, b: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1,
          );
        }
      }
    }

    return matrix[b.length][a.length];
  }
}

// ============================================================================
// Fastify Server
// ============================================================================

const server: FastifyInstance = Fastify({
  logger: {
    level: NODE_ENV === 'development' ? 'debug' : 'info',
    ...(NODE_ENV === 'development'
      ? { transport: { target: 'pino-pretty' } }
      : {}),
  },
});

server.register(helmet);
server.register(cors, {
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
});

const matcher = new EntityMatcher();

// Health check
server.get('/health', async () => {
  try {
    await pool.query('SELECT 1');
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
    };
  }
});

// ============================================================================
// Candidate Endpoints
// ============================================================================

// Find match candidates for an entity
server.get<{ Params: { entityId: string }; Querystring: { limit?: number } }>(
  '/er/candidates/:entityId',
  async (request, reply) => {
    try {
      const { entityId } = request.params;
      const limit = request.query.limit || 10;

      // Get the reference entity
      const refResult = await pool.query(
        'SELECT * FROM entities WHERE id = $1',
        [entityId],
      );

      if (refResult.rows.length === 0) {
        reply.status(404);
        return { error: 'Entity not found' };
      }

      const refEntity: Entity = {
        id: refResult.rows[0].id,
        canonicalFacets: refResult.rows[0].canonical_facets,
        sourceRefs: refResult.rows[0].source_refs || [],
        mergeHistory: refResult.rows[0].merge_history || [],
        created_at: refResult.rows[0].created_at,
        updated_at: refResult.rows[0].updated_at,
        policyLabels: refResult.rows[0].policy_labels || [],
      };

      // Find candidates (simplified: get entities of same type)
      const candidatesResult = await pool.query(
        `SELECT * FROM entities
         WHERE id != $1
         AND canonical_facets->>'@type' = $2
         LIMIT 100`,
        [entityId, refEntity.canonicalFacets['@type']],
      );

      const candidates: MatchCandidate[] = [];

      for (const row of candidatesResult.rows) {
        const candidate: Entity = {
          id: row.id,
          canonicalFacets: row.canonical_facets,
          sourceRefs: row.source_refs || [],
          mergeHistory: row.merge_history || [],
          created_at: row.created_at,
          updated_at: row.updated_at,
          policyLabels: row.policy_labels || [],
        };

        const featureVector = await matcher.computeFeatureVector(refEntity, candidate);
        const score = matcher.computeOverallScore(featureVector);

        if (score > 0.3) {
          const scorecard = matcher.generateScorecard(refEntity, candidate, featureVector);

          candidates.push({
            entityId: candidate.id,
            score,
            featureVector,
            explanation: scorecard.explanation.map((e) => e.rationale),
            requiresAdjudication: scorecard.matchDecision === 'REVIEW',
          });
        }
      }

      // Sort by score and limit
      candidates.sort((a, b) => b.score - a.score);

      return {
        referenceEntityId: entityId,
        candidates: candidates.slice(0, limit),
        totalCandidates: candidates.length,
      };
    } catch (error) {
      server.log.error(error, 'Failed to find candidates');
      reply.status(500);
      return { error: 'Failed to find match candidates' };
    }
  },
);

// ============================================================================
// Merge Endpoints
// ============================================================================

// Merge two entities
server.post<{ Body: z.infer<typeof MergeRequestSchema> }>(
  '/er/merge',
  async (request, reply) => {
    try {
      const { sourceEntityId, targetEntityId, reason, override } = MergeRequestSchema.parse(request.body);

      // Get both entities
      const [sourceResult, targetResult] = await Promise.all([
        pool.query('SELECT * FROM entities WHERE id = $1', [sourceEntityId]),
        pool.query('SELECT * FROM entities WHERE id = $1', [targetEntityId]),
      ]);

      if (sourceResult.rows.length === 0 || targetResult.rows.length === 0) {
        reply.status(404);
        return { error: 'One or both entities not found' };
      }

      const sourceEntity: Entity = {
        id: sourceResult.rows[0].id,
        canonicalFacets: sourceResult.rows[0].canonical_facets,
        sourceRefs: sourceResult.rows[0].source_refs || [],
        mergeHistory: sourceResult.rows[0].merge_history || [],
        created_at: sourceResult.rows[0].created_at,
        updated_at: sourceResult.rows[0].updated_at,
        policyLabels: sourceResult.rows[0].policy_labels || [],
      };

      const targetEntity: Entity = {
        id: targetResult.rows[0].id,
        canonicalFacets: targetResult.rows[0].canonical_facets,
        sourceRefs: targetResult.rows[0].source_refs || [],
        mergeHistory: targetResult.rows[0].merge_history || [],
        created_at: targetResult.rows[0].created_at,
        updated_at: targetResult.rows[0].updated_at,
        policyLabels: targetResult.rows[0].policy_labels || [],
      };

      // Compute feature vector for audit
      const featureVector = await matcher.computeFeatureVector(sourceEntity, targetEntity);
      const score = matcher.computeOverallScore(featureVector);

      // Require override for low-confidence merges
      if (score < 0.5 && !override) {
        reply.status(400);
        return {
          error: 'Low confidence merge requires override flag',
          score,
          featureVector,
        };
      }

      // Create merge event
      const mergeEvent: MergeEvent = {
        id: `merge_${uuidv4()}`,
        timestamp: new Date().toISOString(),
        sourceEntityId,
        targetEntityId,
        mergedBy: (request.headers['x-user-id'] as string) || 'system',
        reason,
        reversible: true,
        featureVector,
      };

      // Merge: combine facets, sources, policy labels
      const mergedFacets = {
        ...targetEntity.canonicalFacets,
        ...sourceEntity.canonicalFacets,
        identifier: [
          ...(targetEntity.canonicalFacets.identifier || []),
          ...(sourceEntity.canonicalFacets.identifier || []),
        ],
      };

      const mergedSources = [...new Set([...targetEntity.sourceRefs, ...sourceEntity.sourceRefs])];
      const mergedLabels = [...new Set([...targetEntity.policyLabels, ...sourceEntity.policyLabels])];
      const mergedHistory = [...targetEntity.mergeHistory, mergeEvent];

      // Update target entity
      await pool.query(
        `UPDATE entities
         SET canonical_facets = $1,
             source_refs = $2,
             policy_labels = $3,
             merge_history = $4,
             updated_at = NOW()
         WHERE id = $5`,
        [
          JSON.stringify(mergedFacets),
          JSON.stringify(mergedSources),
          JSON.stringify(mergedLabels),
          JSON.stringify(mergedHistory),
          targetEntityId,
        ],
      );

      // Mark source as merged (soft delete)
      await pool.query(
        `UPDATE entities
         SET merged_into = $1, updated_at = NOW()
         WHERE id = $2`,
        [targetEntityId, sourceEntityId],
      );

      // Log merge event
      await pool.query(
        `INSERT INTO merge_log (id, source_entity_id, target_entity_id, merged_by, reason, feature_vector, reversible, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
        [
          mergeEvent.id,
          sourceEntityId,
          targetEntityId,
          mergeEvent.mergedBy,
          reason,
          JSON.stringify(featureVector),
          true,
        ],
      );

      server.log.info({
        mergeId: mergeEvent.id,
        sourceEntityId,
        targetEntityId,
        score,
      }, 'Merged entities');

      return {
        mergeId: mergeEvent.id,
        mergedEntityId: targetEntityId,
        score,
        featureVector,
        reversible: true,
      };
    } catch (error) {
      server.log.error(error, 'Failed to merge entities');
      reply.status(500);
      return { error: 'Failed to merge entities' };
    }
  },
);

// Split an entity (reverse a merge or manual split)
server.post<{ Body: z.infer<typeof SplitRequestSchema> }>(
  '/er/split',
  async (request, reply) => {
    try {
      const { entityId, facetIds, reason } = SplitRequestSchema.parse(request.body);

      // Get the entity
      const result = await pool.query('SELECT * FROM entities WHERE id = $1', [entityId]);

      if (result.rows.length === 0) {
        reply.status(404);
        return { error: 'Entity not found' };
      }

      const entity: Entity = {
        id: result.rows[0].id,
        canonicalFacets: result.rows[0].canonical_facets,
        sourceRefs: result.rows[0].source_refs || [],
        mergeHistory: result.rows[0].merge_history || [],
        created_at: result.rows[0].created_at,
        updated_at: result.rows[0].updated_at,
        policyLabels: result.rows[0].policy_labels || [],
      };

      // Check if this was a merge that can be reversed
      const lastMerge = entity.mergeHistory[entity.mergeHistory.length - 1];

      if (lastMerge?.reversible) {
        // Reverse the merge
        await pool.query(
          `UPDATE entities SET merged_into = NULL, updated_at = NOW() WHERE id = $1`,
          [lastMerge.sourceEntityId],
        );

        // Remove the merge from history
        const updatedHistory = entity.mergeHistory.slice(0, -1);
        await pool.query(
          `UPDATE entities SET merge_history = $1, updated_at = NOW() WHERE id = $2`,
          [JSON.stringify(updatedHistory), entityId],
        );

        // Log the split
        await pool.query(
          `INSERT INTO split_log (id, entity_id, split_to, reason, reversed_merge_id, created_at)
           VALUES ($1, $2, $3, $4, $5, NOW())`,
          [
            `split_${uuidv4()}`,
            entityId,
            JSON.stringify([lastMerge.sourceEntityId]),
            reason,
            lastMerge.id,
          ],
        );

        return {
          splitId: `split_${uuidv4()}`,
          originalEntityId: entityId,
          newEntityIds: [lastMerge.sourceEntityId],
          reversedMergeId: lastMerge.id,
        };
      }

      // Manual split (not reversing a merge)
      const newEntityId = `entity_${uuidv4()}`;

      // This would require more complex logic to split facets
      // For now, return an error indicating manual split needs adjudication
      reply.status(400);
      return {
        error: 'Manual split requires adjudication',
        suggestedPath: '/er/adjudication/create',
      };
    } catch (error) {
      server.log.error(error, 'Failed to split entity');
      reply.status(500);
      return { error: 'Failed to split entity' };
    }
  },
);

// ============================================================================
// Explain Endpoint
// ============================================================================

// Get explanation for a match/non-match decision
server.get<{ Params: { entityAId: string; entityBId: string } }>(
  '/er/explain/:entityAId/:entityBId',
  async (request, reply) => {
    try {
      const { entityAId, entityBId } = request.params;

      // Get both entities
      const [resultA, resultB] = await Promise.all([
        pool.query('SELECT * FROM entities WHERE id = $1', [entityAId]),
        pool.query('SELECT * FROM entities WHERE id = $1', [entityBId]),
      ]);

      if (resultA.rows.length === 0 || resultB.rows.length === 0) {
        reply.status(404);
        return { error: 'One or both entities not found' };
      }

      const entityA: Entity = {
        id: resultA.rows[0].id,
        canonicalFacets: resultA.rows[0].canonical_facets,
        sourceRefs: resultA.rows[0].source_refs || [],
        mergeHistory: resultA.rows[0].merge_history || [],
        created_at: resultA.rows[0].created_at,
        updated_at: resultA.rows[0].updated_at,
        policyLabels: resultA.rows[0].policy_labels || [],
      };

      const entityB: Entity = {
        id: resultB.rows[0].id,
        canonicalFacets: resultB.rows[0].canonical_facets,
        sourceRefs: resultB.rows[0].source_refs || [],
        mergeHistory: resultB.rows[0].merge_history || [],
        created_at: resultB.rows[0].created_at,
        updated_at: resultB.rows[0].updated_at,
        policyLabels: resultB.rows[0].policy_labels || [],
      };

      const featureVector = await matcher.computeFeatureVector(entityA, entityB);
      const scorecard = matcher.generateScorecard(entityA, entityB, featureVector);

      return {
        entityA: {
          id: entityA.id,
          facets: entityA.canonicalFacets,
        },
        entityB: {
          id: entityB.id,
          facets: entityB.canonicalFacets,
        },
        scorecard,
      };
    } catch (error) {
      server.log.error(error, 'Failed to explain match');
      reply.status(500);
      return { error: 'Failed to generate explanation' };
    }
  },
);

// Start server
const start = async () => {
  try {
    await server.listen({ port: PORT, host: '0.0.0.0' });
    server.log.info(
      `Entity Resolution service ready at http://localhost:${PORT}`,
    );
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();
