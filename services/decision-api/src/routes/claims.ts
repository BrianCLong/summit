/**
 * Claim routes - CRUD operations for claims about entities
 */

import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { v4 as uuid } from 'uuid';
import crypto from 'crypto';
import { pool } from '../index.js';
import { ClaimStatus, ClaimConfidenceLevel } from '@intelgraph/decision-graph';
import { hasPermission } from '../middleware/auth.js';

// Request schemas
const CreateClaimBody = z.object({
  entity_id: z.string().uuid(),
  claim_type: z.string().min(1).max(100),
  assertion: z.string().min(1).max(2000),
  confidence_score: z.number().min(0).max(1).default(0.5),
  evidence_ids: z.array(z.string().uuid()).optional(),
  source_type: z.enum(['human', 'ai', 'automated', 'external']),
  source_id: z.string(),
  policy_labels: z.array(z.string()).optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

const UpdateClaimBody = z.object({
  assertion: z.string().min(1).max(2000).optional(),
  confidence_score: z.number().min(0).max(1).optional(),
  status: ClaimStatus.optional(),
  evidence_ids: z.array(z.string().uuid()).optional(),
  supporting_claim_ids: z.array(z.string().uuid()).optional(),
  contradicting_claim_ids: z.array(z.string().uuid()).optional(),
  policy_labels: z.array(z.string()).optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

const VerifyClaimBody = z.object({
  verified: z.boolean(),
  comment: z.string().optional(),
});

export async function claimRoutes(fastify: FastifyInstance): Promise<void> {
  // Create claim
  fastify.post<{ Body: z.infer<typeof CreateClaimBody> }>(
    '/',
    async (request, reply) => {
      if (!hasPermission(request.auth, 'claim:create')) {
        return reply.status(403).send({ error: 'Forbidden' });
      }

      const parse = CreateClaimBody.safeParse(request.body);
      if (!parse.success) {
        return reply.status(400).send({ error: parse.error.flatten() });
      }

      const data = parse.data;
      const now = new Date().toISOString();
      const id = `claim_${uuid()}`;

      // Derive confidence level from score
      const confidence_level = deriveConfidenceLevel(data.confidence_score);

      // Generate content hash for integrity
      const hash = crypto
        .createHash('sha256')
        .update(
          JSON.stringify({
            entity_id: data.entity_id,
            claim_type: data.claim_type,
            assertion: data.assertion,
            created_at: now,
          }),
        )
        .digest('hex');

      try {
        // Verify entity exists
        const entityCheck = await pool.query(
          'SELECT id FROM entities WHERE id = $1 AND tenant_id = $2',
          [data.entity_id, request.auth.tenant_id],
        );

        if (entityCheck.rows.length === 0) {
          return reply.status(400).send({ error: 'Entity not found' });
        }

        const result = await pool.query(
          `INSERT INTO claims (
            id, entity_id, claim_type, assertion, confidence_score, confidence_level,
            status, evidence_ids, supporting_claim_ids, contradicting_claim_ids,
            source_type, source_id, policy_labels, metadata, hash,
            created_at, updated_at, created_by, tenant_id, version
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $16, $17, $18, 1)
          RETURNING *`,
          [
            id,
            data.entity_id,
            data.claim_type,
            data.assertion,
            data.confidence_score,
            confidence_level,
            'draft',
            JSON.stringify(data.evidence_ids || []),
            JSON.stringify([]),
            JSON.stringify([]),
            data.source_type,
            data.source_id,
            JSON.stringify(data.policy_labels || []),
            JSON.stringify(data.metadata || {}),
            hash,
            now,
            request.auth.user_id,
            request.auth.tenant_id,
          ],
        );

        request.log.info({ claimId: id, entityId: data.entity_id }, 'Claim created');

        return reply.status(201).send(mapRowToClaim(result.rows[0]));
      } catch (error) {
        request.log.error({ error }, 'Failed to create claim');
        return reply.status(500).send({ error: 'Failed to create claim' });
      }
    },
  );

  // Get claim by ID
  fastify.get<{ Params: { id: string } }>(
    '/:id',
    async (request, reply) => {
      if (!hasPermission(request.auth, 'claim:read')) {
        return reply.status(403).send({ error: 'Forbidden' });
      }

      const { id } = request.params;

      try {
        const result = await pool.query(
          'SELECT * FROM claims WHERE id = $1 AND tenant_id = $2',
          [id, request.auth.tenant_id],
        );

        if (result.rows.length === 0) {
          return reply.status(404).send({ error: 'Claim not found' });
        }

        return mapRowToClaim(result.rows[0]);
      } catch (error) {
        request.log.error({ error }, 'Failed to get claim');
        return reply.status(500).send({ error: 'Failed to retrieve claim' });
      }
    },
  );

  // Update claim
  fastify.put<{ Params: { id: string }; Body: z.infer<typeof UpdateClaimBody> }>(
    '/:id',
    async (request, reply) => {
      if (!hasPermission(request.auth, 'claim:update')) {
        return reply.status(403).send({ error: 'Forbidden' });
      }

      const { id } = request.params;
      const parse = UpdateClaimBody.safeParse(request.body);
      if (!parse.success) {
        return reply.status(400).send({ error: parse.error.flatten() });
      }

      const updates = parse.data;
      const now = new Date().toISOString();

      try {
        // Build dynamic update query
        const setClause: string[] = ['updated_at = $1', 'version = version + 1'];
        const values: any[] = [now];
        let paramIndex = 2;

        if (updates.assertion !== undefined) {
          setClause.push(`assertion = $${paramIndex++}`);
          values.push(updates.assertion);
        }
        if (updates.confidence_score !== undefined) {
          setClause.push(`confidence_score = $${paramIndex++}`);
          values.push(updates.confidence_score);
          setClause.push(`confidence_level = $${paramIndex++}`);
          values.push(deriveConfidenceLevel(updates.confidence_score));
        }
        if (updates.status !== undefined) {
          setClause.push(`status = $${paramIndex++}`);
          values.push(updates.status);
        }
        if (updates.evidence_ids !== undefined) {
          setClause.push(`evidence_ids = $${paramIndex++}`);
          values.push(JSON.stringify(updates.evidence_ids));
        }
        if (updates.supporting_claim_ids !== undefined) {
          setClause.push(`supporting_claim_ids = $${paramIndex++}`);
          values.push(JSON.stringify(updates.supporting_claim_ids));
        }
        if (updates.contradicting_claim_ids !== undefined) {
          setClause.push(`contradicting_claim_ids = $${paramIndex++}`);
          values.push(JSON.stringify(updates.contradicting_claim_ids));
        }
        if (updates.policy_labels !== undefined) {
          setClause.push(`policy_labels = $${paramIndex++}`);
          values.push(JSON.stringify(updates.policy_labels));
        }
        if (updates.metadata !== undefined) {
          setClause.push(`metadata = $${paramIndex++}`);
          values.push(JSON.stringify(updates.metadata));
        }

        values.push(id, request.auth.tenant_id);

        const result = await pool.query(
          `UPDATE claims SET ${setClause.join(', ')}
           WHERE id = $${paramIndex++} AND tenant_id = $${paramIndex}
           RETURNING *`,
          values,
        );

        if (result.rows.length === 0) {
          return reply.status(404).send({ error: 'Claim not found' });
        }

        return mapRowToClaim(result.rows[0]);
      } catch (error) {
        request.log.error({ error }, 'Failed to update claim');
        return reply.status(500).send({ error: 'Failed to update claim' });
      }
    },
  );

  // Verify claim (change status to verified or disputed)
  fastify.post<{ Params: { id: string }; Body: z.infer<typeof VerifyClaimBody> }>(
    '/:id/verify',
    async (request, reply) => {
      if (!hasPermission(request.auth, 'claim:verify')) {
        return reply.status(403).send({ error: 'Forbidden' });
      }

      const { id } = request.params;
      const parse = VerifyClaimBody.safeParse(request.body);
      if (!parse.success) {
        return reply.status(400).send({ error: parse.error.flatten() });
      }

      const { verified, comment } = parse.data;
      const now = new Date().toISOString();
      const newStatus = verified ? 'verified' : 'disputed';

      try {
        const result = await pool.query(
          `UPDATE claims SET
            status = $1,
            reviewed_by = $2,
            reviewed_at = $3,
            updated_at = $3,
            version = version + 1,
            metadata = metadata || $4
           WHERE id = $5 AND tenant_id = $6
           RETURNING *`,
          [
            newStatus,
            request.auth.user_id,
            now,
            JSON.stringify(comment ? { review_comment: comment } : {}),
            id,
            request.auth.tenant_id,
          ],
        );

        if (result.rows.length === 0) {
          return reply.status(404).send({ error: 'Claim not found' });
        }

        request.log.info({ claimId: id, status: newStatus }, 'Claim verified');

        return mapRowToClaim(result.rows[0]);
      } catch (error) {
        request.log.error({ error }, 'Failed to verify claim');
        return reply.status(500).send({ error: 'Failed to verify claim' });
      }
    },
  );

  // Attach evidence to claim
  fastify.post<{ Params: { id: string }; Body: { evidence_id: string } }>(
    '/:id/evidence',
    async (request, reply) => {
      if (!hasPermission(request.auth, 'claim:update')) {
        return reply.status(403).send({ error: 'Forbidden' });
      }

      const { id } = request.params;
      const { evidence_id } = request.body;

      if (!evidence_id) {
        return reply.status(400).send({ error: 'evidence_id is required' });
      }

      try {
        // Verify evidence exists
        const evidenceCheck = await pool.query(
          'SELECT id FROM evidence WHERE id = $1 AND tenant_id = $2',
          [evidence_id, request.auth.tenant_id],
        );

        if (evidenceCheck.rows.length === 0) {
          return reply.status(400).send({ error: 'Evidence not found' });
        }

        // Add evidence to claim
        const result = await pool.query(
          `UPDATE claims SET
            evidence_ids = evidence_ids || $1::jsonb,
            updated_at = $2,
            version = version + 1
           WHERE id = $3 AND tenant_id = $4
           AND NOT evidence_ids @> $1::jsonb
           RETURNING *`,
          [
            JSON.stringify([evidence_id]),
            new Date().toISOString(),
            id,
            request.auth.tenant_id,
          ],
        );

        if (result.rows.length === 0) {
          // Either claim not found or evidence already attached
          const existingClaim = await pool.query(
            'SELECT * FROM claims WHERE id = $1 AND tenant_id = $2',
            [id, request.auth.tenant_id],
          );

          if (existingClaim.rows.length === 0) {
            return reply.status(404).send({ error: 'Claim not found' });
          }

          return mapRowToClaim(existingClaim.rows[0]); // Evidence already attached
        }

        request.log.info({ claimId: id, evidenceId: evidence_id }, 'Evidence attached');

        return mapRowToClaim(result.rows[0]);
      } catch (error) {
        request.log.error({ error }, 'Failed to attach evidence');
        return reply.status(500).send({ error: 'Failed to attach evidence' });
      }
    },
  );

  // List claims
  fastify.get(
    '/',
    async (request, reply) => {
      if (!hasPermission(request.auth, 'claim:read')) {
        return reply.status(403).send({ error: 'Forbidden' });
      }

      const query = request.query as any;
      const limit = Math.min(parseInt(query.limit) || 20, 100);
      const offset = parseInt(query.offset) || 0;

      try {
        const conditions: string[] = ['tenant_id = $1'];
        const values: any[] = [request.auth.tenant_id];
        let paramIndex = 2;

        if (query.entity_id) {
          conditions.push(`entity_id = $${paramIndex++}`);
          values.push(query.entity_id);
        }
        if (query.status) {
          conditions.push(`status = $${paramIndex++}`);
          values.push(query.status);
        }
        if (query.claim_type) {
          conditions.push(`claim_type = $${paramIndex++}`);
          values.push(query.claim_type);
        }

        const whereClause = conditions.join(' AND ');

        const countResult = await pool.query(
          `SELECT count(*) FROM claims WHERE ${whereClause}`,
          values,
        );
        const total = parseInt(countResult.rows[0].count);

        values.push(limit, offset);
        const result = await pool.query(
          `SELECT * FROM claims WHERE ${whereClause}
           ORDER BY created_at DESC
           LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
          values,
        );

        const items = result.rows.map(mapRowToClaim);

        return {
          items,
          total,
          has_more: offset + items.length < total,
          limit,
          offset,
        };
      } catch (error) {
        request.log.error({ error }, 'Failed to list claims');
        return reply.status(500).send({ error: 'Failed to list claims' });
      }
    },
  );

  // Get evidence for claim
  fastify.get<{ Params: { id: string } }>(
    '/:id/evidence',
    async (request, reply) => {
      if (!hasPermission(request.auth, 'evidence:read')) {
        return reply.status(403).send({ error: 'Forbidden' });
      }

      const { id } = request.params;

      try {
        // Get claim to find evidence IDs
        const claimResult = await pool.query(
          'SELECT evidence_ids FROM claims WHERE id = $1 AND tenant_id = $2',
          [id, request.auth.tenant_id],
        );

        if (claimResult.rows.length === 0) {
          return reply.status(404).send({ error: 'Claim not found' });
        }

        const evidenceIds = claimResult.rows[0].evidence_ids || [];
        if (evidenceIds.length === 0) {
          return { items: [], total: 0 };
        }

        const result = await pool.query(
          'SELECT * FROM evidence WHERE id = ANY($1) AND tenant_id = $2',
          [evidenceIds, request.auth.tenant_id],
        );

        return {
          items: result.rows,
          total: result.rows.length,
        };
      } catch (error) {
        request.log.error({ error }, 'Failed to get evidence for claim');
        return reply.status(500).send({ error: 'Failed to retrieve evidence' });
      }
    },
  );
}

function deriveConfidenceLevel(score: number): string {
  if (score >= 0.99) return 'certain';
  if (score >= 0.9) return 'very_high';
  if (score >= 0.75) return 'high';
  if (score >= 0.5) return 'medium';
  return 'low';
}

function mapRowToClaim(row: any) {
  return {
    id: row.id,
    entity_id: row.entity_id,
    claim_type: row.claim_type,
    assertion: row.assertion,
    confidence_score: row.confidence_score,
    confidence_level: row.confidence_level,
    status: row.status,
    evidence_ids: row.evidence_ids,
    supporting_claim_ids: row.supporting_claim_ids,
    contradicting_claim_ids: row.contradicting_claim_ids,
    source_type: row.source_type,
    source_id: row.source_id,
    policy_labels: row.policy_labels,
    metadata: row.metadata,
    hash: row.hash,
    created_at: row.created_at,
    updated_at: row.updated_at,
    created_by: row.created_by,
    reviewed_by: row.reviewed_by,
    reviewed_at: row.reviewed_at,
    tenant_id: row.tenant_id,
    version: row.version,
    superseded_by: row.superseded_by,
  };
}
