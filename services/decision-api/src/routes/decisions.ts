/**
 * Decision routes - CRUD operations for decisions with full provenance
 */

import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { v4 as uuid } from 'uuid';
import crypto from 'crypto';
import { pool } from '../index.js';
import { DecisionType, DecisionStatus } from '@intelgraph/decision-graph';
import { hasPermission } from '../middleware/auth.js';

// Request schemas
const CreateDecisionBody = z.object({
  type: DecisionType,
  title: z.string().min(1).max(500),
  question: z.string().min(1).max(2000),
  context: z.string().max(10000).optional(),
  constraints: z.array(z.string()).optional(),
  options: z.array(z.object({
    name: z.string().min(1).max(200),
    description: z.string(),
    pros: z.array(z.string()).optional(),
    cons: z.array(z.string()).optional(),
    risk_level: z.enum(['low', 'medium', 'high', 'critical']),
  })).min(1),
  entity_ids: z.array(z.string().uuid()).optional(),
  require_approval: z.boolean().default(true),
});

const UpdateDecisionBody = z.object({
  selected_option_id: z.string().uuid().optional(),
  recommendation: z.string().optional(),
  rationale: z.string().optional(),
  status: DecisionStatus.optional(),
  claim_ids: z.array(z.string().uuid()).optional(),
  evidence_ids: z.array(z.string().uuid()).optional(),
  risk_assessment: z.object({
    overall_risk: z.enum(['low', 'medium', 'high', 'critical']),
    risk_factors: z.array(z.string()).optional(),
    mitigations: z.array(z.string()).optional(),
  }).optional(),
});

const ApprovalBody = z.object({
  comment: z.string().optional(),
});

const RejectBody = z.object({
  reason: z.string().min(1),
});

export async function decisionRoutes(fastify: FastifyInstance): Promise<void> {
  // Create decision
  fastify.post<{ Body: z.infer<typeof CreateDecisionBody> }>(
    '/',
    async (request, reply) => {
      if (!hasPermission(request.auth, 'decision:create')) {
        return reply.status(403).send({ error: 'Forbidden' });
      }

      const parse = CreateDecisionBody.safeParse(request.body);
      if (!parse.success) {
        return reply.status(400).send({ error: parse.error.flatten() });
      }

      const data = parse.data;
      const now = new Date().toISOString();
      const id = `decision_${uuid()}`;

      // Generate option IDs
      const options = data.options.map((opt) => ({
        id: `option_${uuid()}`,
        ...opt,
        pros: opt.pros || [],
        cons: opt.cons || [],
        supporting_claim_ids: [],
        estimated_impact: {},
        selected: false,
      }));

      // Generate content hash
      const hash = crypto
        .createHash('sha256')
        .update(JSON.stringify({
          question: data.question,
          created_at: now,
        }))
        .digest('hex');

      // Initial approval chain if required
      const approvalChain = data.require_approval
        ? [{
            approver_id: '',
            role: 'supervisor',
            status: 'pending' as const,
          }]
        : [];

      try {
        const result = await pool.query(
          `INSERT INTO decisions (
            id, type, title, question, context, constraints, options,
            claim_ids, evidence_ids, entity_ids, status, decision_maker_id,
            decision_maker_type, policy_labels, approval_chain, hash,
            created_at, updated_at, created_by, tenant_id, version
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $17, $18, $19, 1)
          RETURNING *`,
          [
            id,
            data.type,
            data.title,
            data.question,
            data.context || null,
            JSON.stringify(data.constraints || []),
            JSON.stringify(options),
            JSON.stringify([]),
            JSON.stringify([]),
            JSON.stringify(data.entity_ids || []),
            'draft',
            request.auth.user_id,
            'human',
            JSON.stringify([]),
            JSON.stringify(approvalChain),
            hash,
            now,
            request.auth.user_id,
            request.auth.tenant_id,
          ],
        );

        request.log.info({ decisionId: id }, 'Decision created');

        return reply.status(201).send(mapRowToDecision(result.rows[0]));
      } catch (error) {
        request.log.error({ error }, 'Failed to create decision');
        return reply.status(500).send({ error: 'Failed to create decision' });
      }
    },
  );

  // Get decision by ID
  fastify.get<{ Params: { id: string } }>(
    '/:id',
    async (request, reply) => {
      if (!hasPermission(request.auth, 'decision:read')) {
        return reply.status(403).send({ error: 'Forbidden' });
      }

      const { id } = request.params;

      try {
        const result = await pool.query(
          'SELECT * FROM decisions WHERE id = $1 AND tenant_id = $2',
          [id, request.auth.tenant_id],
        );

        if (result.rows.length === 0) {
          return reply.status(404).send({ error: 'Decision not found' });
        }

        return mapRowToDecision(result.rows[0]);
      } catch (error) {
        request.log.error({ error }, 'Failed to get decision');
        return reply.status(500).send({ error: 'Failed to retrieve decision' });
      }
    },
  );

  // Update decision
  fastify.put<{ Params: { id: string }; Body: z.infer<typeof UpdateDecisionBody> }>(
    '/:id',
    async (request, reply) => {
      if (!hasPermission(request.auth, 'decision:update')) {
        return reply.status(403).send({ error: 'Forbidden' });
      }

      const { id } = request.params;
      const parse = UpdateDecisionBody.safeParse(request.body);
      if (!parse.success) {
        return reply.status(400).send({ error: parse.error.flatten() });
      }

      const updates = parse.data;
      const now = new Date().toISOString();

      try {
        // First get the current decision
        const currentResult = await pool.query(
          'SELECT * FROM decisions WHERE id = $1 AND tenant_id = $2',
          [id, request.auth.tenant_id],
        );

        if (currentResult.rows.length === 0) {
          return reply.status(404).send({ error: 'Decision not found' });
        }

        const current = currentResult.rows[0];

        // Build dynamic update query
        const setClause: string[] = ['updated_at = $1', 'version = version + 1'];
        const values: any[] = [now];
        let paramIndex = 2;

        if (updates.selected_option_id !== undefined) {
          // Update options to mark selected
          const options = current.options.map((opt: any) => ({
            ...opt,
            selected: opt.id === updates.selected_option_id,
          }));
          setClause.push(`options = $${paramIndex++}`);
          values.push(JSON.stringify(options));
          setClause.push(`selected_option_id = $${paramIndex++}`);
          values.push(updates.selected_option_id);
        }
        if (updates.recommendation !== undefined) {
          setClause.push(`recommendation = $${paramIndex++}`);
          values.push(updates.recommendation);
        }
        if (updates.rationale !== undefined) {
          setClause.push(`rationale = $${paramIndex++}`);
          values.push(updates.rationale);
        }
        if (updates.status !== undefined) {
          setClause.push(`status = $${paramIndex++}`);
          values.push(updates.status);
        }
        if (updates.claim_ids !== undefined) {
          setClause.push(`claim_ids = $${paramIndex++}`);
          values.push(JSON.stringify(updates.claim_ids));
        }
        if (updates.evidence_ids !== undefined) {
          setClause.push(`evidence_ids = $${paramIndex++}`);
          values.push(JSON.stringify(updates.evidence_ids));
        }
        if (updates.risk_assessment !== undefined) {
          setClause.push(`risk_assessment = $${paramIndex++}`);
          values.push(JSON.stringify(updates.risk_assessment));
        }

        values.push(id, request.auth.tenant_id);

        const result = await pool.query(
          `UPDATE decisions SET ${setClause.join(', ')}
           WHERE id = $${paramIndex++} AND tenant_id = $${paramIndex}
           RETURNING *`,
          values,
        );

        return mapRowToDecision(result.rows[0]);
      } catch (error) {
        request.log.error({ error }, 'Failed to update decision');
        return reply.status(500).send({ error: 'Failed to update decision' });
      }
    },
  );

  // Approve decision
  fastify.post<{ Params: { id: string }; Body: z.infer<typeof ApprovalBody> }>(
    '/:id/approve',
    async (request, reply) => {
      if (!hasPermission(request.auth, 'decision:approve')) {
        return reply.status(403).send({ error: 'Forbidden' });
      }

      const { id } = request.params;
      const parse = ApprovalBody.safeParse(request.body);
      if (!parse.success) {
        return reply.status(400).send({ error: parse.error.flatten() });
      }

      const { comment } = parse.data;
      const now = new Date().toISOString();

      try {
        // Get current decision
        const currentResult = await pool.query(
          'SELECT * FROM decisions WHERE id = $1 AND tenant_id = $2',
          [id, request.auth.tenant_id],
        );

        if (currentResult.rows.length === 0) {
          return reply.status(404).send({ error: 'Decision not found' });
        }

        const current = currentResult.rows[0];

        // Check if already approved
        if (current.status === 'approved') {
          return reply.status(400).send({ error: 'Decision already approved' });
        }

        // Update approval chain
        const approvalChain = current.approval_chain || [];
        approvalChain.push({
          approver_id: request.auth.user_id,
          role: request.auth.role,
          status: 'approved',
          timestamp: now,
          comment: comment || null,
        });

        const result = await pool.query(
          `UPDATE decisions SET
            status = 'approved',
            approval_chain = $1,
            decided_at = $2,
            updated_at = $2,
            version = version + 1
           WHERE id = $3 AND tenant_id = $4
           RETURNING *`,
          [JSON.stringify(approvalChain), now, id, request.auth.tenant_id],
        );

        request.log.info({
          decisionId: id,
          approver: request.auth.user_id,
        }, 'Decision approved');

        return mapRowToDecision(result.rows[0]);
      } catch (error) {
        request.log.error({ error }, 'Failed to approve decision');
        return reply.status(500).send({ error: 'Failed to approve decision' });
      }
    },
  );

  // Reject decision
  fastify.post<{ Params: { id: string }; Body: z.infer<typeof RejectBody> }>(
    '/:id/reject',
    async (request, reply) => {
      if (!hasPermission(request.auth, 'decision:approve')) {
        return reply.status(403).send({ error: 'Forbidden' });
      }

      const { id } = request.params;
      const parse = RejectBody.safeParse(request.body);
      if (!parse.success) {
        return reply.status(400).send({ error: parse.error.flatten() });
      }

      const { reason } = parse.data;
      const now = new Date().toISOString();

      try {
        const currentResult = await pool.query(
          'SELECT * FROM decisions WHERE id = $1 AND tenant_id = $2',
          [id, request.auth.tenant_id],
        );

        if (currentResult.rows.length === 0) {
          return reply.status(404).send({ error: 'Decision not found' });
        }

        const current = currentResult.rows[0];

        const approvalChain = current.approval_chain || [];
        approvalChain.push({
          approver_id: request.auth.user_id,
          role: request.auth.role,
          status: 'rejected',
          timestamp: now,
          comment: reason,
        });

        const result = await pool.query(
          `UPDATE decisions SET
            status = 'rejected',
            approval_chain = $1,
            updated_at = $2,
            version = version + 1
           WHERE id = $3 AND tenant_id = $4
           RETURNING *`,
          [JSON.stringify(approvalChain), now, id, request.auth.tenant_id],
        );

        request.log.info({
          decisionId: id,
          rejector: request.auth.user_id,
          reason,
        }, 'Decision rejected');

        return mapRowToDecision(result.rows[0]);
      } catch (error) {
        request.log.error({ error }, 'Failed to reject decision');
        return reply.status(500).send({ error: 'Failed to reject decision' });
      }
    },
  );

  // List decisions
  fastify.get(
    '/',
    async (request, reply) => {
      if (!hasPermission(request.auth, 'decision:read')) {
        return reply.status(403).send({ error: 'Forbidden' });
      }

      const query = request.query as any;
      const limit = Math.min(parseInt(query.limit) || 20, 100);
      const offset = parseInt(query.offset) || 0;

      try {
        const conditions: string[] = ['tenant_id = $1'];
        const values: any[] = [request.auth.tenant_id];
        let paramIndex = 2;

        if (query.type) {
          conditions.push(`type = $${paramIndex++}`);
          values.push(query.type);
        }
        if (query.status) {
          conditions.push(`status = $${paramIndex++}`);
          values.push(query.status);
        }

        const whereClause = conditions.join(' AND ');

        const countResult = await pool.query(
          `SELECT count(*) FROM decisions WHERE ${whereClause}`,
          values,
        );
        const total = parseInt(countResult.rows[0].count);

        values.push(limit, offset);
        const result = await pool.query(
          `SELECT * FROM decisions WHERE ${whereClause}
           ORDER BY created_at DESC
           LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
          values,
        );

        const items = result.rows.map(mapRowToDecision);

        return {
          items,
          total,
          has_more: offset + items.length < total,
          limit,
          offset,
        };
      } catch (error) {
        request.log.error({ error }, 'Failed to list decisions');
        return reply.status(500).send({ error: 'Failed to list decisions' });
      }
    },
  );

  // Get full decision graph
  fastify.get<{ Params: { id: string } }>(
    '/:id/graph',
    async (request, reply) => {
      if (!hasPermission(request.auth, 'decision:read')) {
        return reply.status(403).send({ error: 'Forbidden' });
      }

      const { id } = request.params;

      try {
        // Get decision
        const decisionResult = await pool.query(
          'SELECT * FROM decisions WHERE id = $1 AND tenant_id = $2',
          [id, request.auth.tenant_id],
        );

        if (decisionResult.rows.length === 0) {
          return reply.status(404).send({ error: 'Decision not found' });
        }

        const decision = mapRowToDecision(decisionResult.rows[0]);

        // Get claims
        const claimIds = decision.claim_ids || [];
        let claims: any[] = [];
        if (claimIds.length > 0) {
          const claimsResult = await pool.query(
            'SELECT * FROM claims WHERE id = ANY($1) AND tenant_id = $2',
            [claimIds, request.auth.tenant_id],
          );
          claims = claimsResult.rows;
        }

        // Get evidence
        const evidenceIds = decision.evidence_ids || [];
        let evidence: any[] = [];
        if (evidenceIds.length > 0) {
          const evidenceResult = await pool.query(
            'SELECT * FROM evidence WHERE id = ANY($1) AND tenant_id = $2',
            [evidenceIds, request.auth.tenant_id],
          );
          evidence = evidenceResult.rows;
        }

        // Get entities
        const entityIds = decision.entity_ids || [];
        let entities: any[] = [];
        if (entityIds.length > 0) {
          const entitiesResult = await pool.query(
            'SELECT * FROM entities WHERE id = ANY($1) AND tenant_id = $2',
            [entityIds, request.auth.tenant_id],
          );
          entities = entitiesResult.rows;
        }

        // Build relationships
        const relationships = buildRelationships(decision, claims, evidence, entities);

        return {
          decision,
          claims,
          evidence,
          entities,
          relationships,
        };
      } catch (error) {
        request.log.error({ error }, 'Failed to get decision graph');
        return reply.status(500).send({ error: 'Failed to retrieve decision graph' });
      }
    },
  );
}

function mapRowToDecision(row: any) {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    question: row.question,
    context: row.context,
    constraints: row.constraints,
    options: row.options,
    selected_option_id: row.selected_option_id,
    recommendation: row.recommendation,
    rationale: row.rationale,
    claim_ids: row.claim_ids,
    evidence_ids: row.evidence_ids,
    entity_ids: row.entity_ids,
    status: row.status,
    decision_maker_id: row.decision_maker_id,
    decision_maker_type: row.decision_maker_type,
    maestro_run_id: row.maestro_run_id,
    confidence_score: row.confidence_score,
    risk_assessment: row.risk_assessment,
    policy_labels: row.policy_labels,
    approval_chain: row.approval_chain,
    hash: row.hash,
    created_at: row.created_at,
    updated_at: row.updated_at,
    decided_at: row.decided_at,
    created_by: row.created_by,
    tenant_id: row.tenant_id,
    version: row.version,
    superseded_by: row.superseded_by,
  };
}

function buildRelationships(
  decision: any,
  claims: any[],
  evidence: any[],
  entities: any[],
): any[] {
  const relationships: any[] = [];
  const now = new Date().toISOString();

  // Decision -> Claims
  for (const claimId of decision.claim_ids || []) {
    relationships.push({
      id: `rel_${crypto.randomUUID()}`,
      type: 'BASED_ON_CLAIM',
      source_id: decision.id,
      source_type: 'decision',
      target_id: claimId,
      target_type: 'claim',
      weight: 1,
      confidence: 1,
      created_at: now,
    });
  }

  // Decision -> Evidence
  for (const evidenceId of decision.evidence_ids || []) {
    relationships.push({
      id: `rel_${crypto.randomUUID()}`,
      type: 'BASED_ON_EVIDENCE',
      source_id: decision.id,
      source_type: 'decision',
      target_id: evidenceId,
      target_type: 'evidence',
      weight: 1,
      confidence: 1,
      created_at: now,
    });
  }

  // Decision -> Entities
  for (const entityId of decision.entity_ids || []) {
    relationships.push({
      id: `rel_${crypto.randomUUID()}`,
      type: 'AFFECTS_ENTITY',
      source_id: decision.id,
      source_type: 'decision',
      target_id: entityId,
      target_type: 'entity',
      weight: 1,
      confidence: 1,
      created_at: now,
    });
  }

  // Claims -> Evidence
  for (const claim of claims) {
    for (const evidenceId of claim.evidence_ids || []) {
      relationships.push({
        id: `rel_${crypto.randomUUID()}`,
        type: 'EVIDENCES',
        source_id: evidenceId,
        source_type: 'evidence',
        target_id: claim.id,
        target_type: 'claim',
        weight: 1,
        confidence: 1,
        created_at: now,
      });
    }
  }

  return relationships;
}
