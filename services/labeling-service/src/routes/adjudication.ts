/**
 * Adjudication endpoints for labeling service
 */

import { FastifyInstance } from 'fastify';
import { Pool } from 'pg';
import {
  CreateAdjudicationSchema,
  AuditEventType,
  LabelStatus,
  UserRole,
  type CreateAdjudication,
  type Adjudication,
} from '../types/index.js';
import { generateAdjudicationId, signData } from '../utils/crypto.js';

export async function registerAdjudicationRoutes(
  server: FastifyInstance,
  pool: Pool,
  servicePrivateKey: string,
  servicePublicKey: string,
  createAuditEvent: any,
  requireRole: any,
) {
  // Create adjudication request
  server.post<{ Body: CreateAdjudication }>(
    '/adjudications',
    {
      schema: { body: CreateAdjudicationSchema },
      preHandler: requireRole(UserRole.REVIEWER, UserRole.ADMIN),
    },
    async (request: any, reply) => {
      try {
        const { labelId, conflictingReviews, reason } = request.body;

        // Verify label exists
        const labelResult = await pool.query(
          'SELECT * FROM labels WHERE id = $1',
          [labelId],
        );

        if (labelResult.rows.length === 0) {
          reply.status(404);
          return { error: 'Label not found' };
        }

        const id = generateAdjudicationId();
        const createdAt = new Date().toISOString();

        const result = await pool.query(
          `INSERT INTO adjudications (
            id, label_id, conflicting_reviews, reason, created_at
          ) VALUES ($1, $2, $3, $4, $5)
          RETURNING *`,
          [id, labelId, conflictingReviews, reason, createdAt],
        );

        // Update label status
        await pool.query(
          'UPDATE labels SET status = $1 WHERE id = $2',
          [LabelStatus.NEEDS_ADJUDICATION, labelId],
        );

        const row = result.rows[0];
        const adjudication: Adjudication = {
          id: row.id,
          labelId: row.label_id,
          conflictingReviews: row.conflicting_reviews,
          reason: row.reason,
          assignedTo: row.assigned_to,
          resolution: row.resolution,
          resolutionReasoning: row.resolution_reasoning,
          resolvedBy: row.resolved_by,
          resolvedAt: row.resolved_at,
          createdAt: row.created_at,
          signature: row.signature,
        };

        // Create audit event
        await createAuditEvent({
          eventType: AuditEventType.ADJUDICATION_REQUESTED,
          userId: request.userId,
          labelId,
          adjudicationId: id,
          afterState: adjudication,
          reasoning: reason,
        });

        server.log.info(
          { adjudicationId: id, labelId, userId: request.userId },
          'Adjudication requested',
        );

        return adjudication;
      } catch (error) {
        server.log.error(error, 'Failed to create adjudication');
        reply.status(500);
        return { error: 'Failed to create adjudication request' };
      }
    },
  );

  // Resolve adjudication
  server.post<{
    Params: { id: string };
    Body: { resolution: any; reasoning: string };
  }>(
    '/adjudications/:id/resolve',
    {
      preHandler: requireRole(UserRole.ADJUDICATOR, UserRole.ADMIN),
    },
    async (request: any, reply) => {
      try {
        const { id } = request.params;
        const { resolution, reasoning } = request.body;

        // Get adjudication
        const adjResult = await pool.query(
          'SELECT * FROM adjudications WHERE id = $1',
          [id],
        );

        if (adjResult.rows.length === 0) {
          reply.status(404);
          return { error: 'Adjudication not found' };
        }

        const adjudication = adjResult.rows[0];

        if (adjudication.resolved_at) {
          reply.status(400);
          return { error: 'Adjudication already resolved' };
        }

        const resolvedAt = new Date().toISOString();

        const resolutionData = {
          id,
          labelId: adjudication.label_id,
          resolution,
          reasoning,
          resolvedBy: request.userId,
          resolvedAt,
        };

        // Sign the resolution
        const signature = await signData(resolutionData, servicePrivateKey);

        // Update adjudication
        await pool.query(
          `UPDATE adjudications
          SET resolution = $1, resolution_reasoning = $2,
              resolved_by = $3, resolved_at = $4,
              signature = $5, public_key = $6
          WHERE id = $7`,
          [
            JSON.stringify(resolution),
            reasoning,
            request.userId,
            resolvedAt,
            signature,
            servicePublicKey,
            id,
          ],
        );

        // Update label
        await pool.query(
          'UPDATE labels SET status = $1, reviewed_by = $2, reviewed_at = $3 WHERE id = $4',
          [
            LabelStatus.ADJUDICATED,
            request.userId,
            resolvedAt,
            adjudication.label_id,
          ],
        );

        // Create audit event
        await createAuditEvent({
          eventType: AuditEventType.ADJUDICATION_COMPLETED,
          userId: request.userId,
          labelId: adjudication.label_id,
          adjudicationId: id,
          beforeState: {
            resolved: false,
          },
          afterState: {
            resolved: true,
            resolution,
          },
          reasoning,
        });

        server.log.info(
          { adjudicationId: id, userId: request.userId },
          'Adjudication resolved',
        );

        return {
          success: true,
          adjudicationId: id,
          resolution,
          signature,
        };
      } catch (error) {
        server.log.error(error, 'Failed to resolve adjudication');
        reply.status(500);
        return { error: 'Failed to resolve adjudication' };
      }
    },
  );

  // List pending adjudications
  server.get<{
    Querystring: {
      resolved?: boolean;
      assignedTo?: string;
      limit?: number;
      offset?: number;
    };
  }>('/adjudications', async (request: any, reply) => {
    try {
      const { resolved, assignedTo, limit = 50, offset = 0 } = request.query;

      let query = 'SELECT * FROM adjudications WHERE 1=1';
      const params: any[] = [];

      if (resolved !== undefined) {
        if (resolved) {
          query += ' AND resolved_at IS NOT NULL';
        } else {
          query += ' AND resolved_at IS NULL';
        }
      }

      if (assignedTo) {
        params.push(assignedTo);
        query += ` AND assigned_to = $${params.length}`;
      }

      query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
      params.push(limit, offset);

      const result = await pool.query(query, params);

      const adjudications: Adjudication[] = result.rows.map((row) => ({
        id: row.id,
        labelId: row.label_id,
        conflictingReviews: row.conflicting_reviews,
        reason: row.reason,
        assignedTo: row.assigned_to,
        resolution: row.resolution,
        resolutionReasoning: row.resolution_reasoning,
        resolvedBy: row.resolved_by,
        resolvedAt: row.resolved_at,
        createdAt: row.created_at,
        signature: row.signature,
      }));

      return { adjudications, total: adjudications.length, offset, limit };
    } catch (error) {
      server.log.error(error, 'Failed to list adjudications');
      reply.status(500);
      return { error: 'Failed to list adjudications' };
    }
  });

  // Get adjudication by ID
  server.get<{ Params: { id: string } }>(
    '/adjudications/:id',
    async (request: any, reply) => {
      try {
        const { id } = request.params;

        const result = await pool.query(
          'SELECT * FROM adjudications WHERE id = $1',
          [id],
        );

        if (result.rows.length === 0) {
          reply.status(404);
          return { error: 'Adjudication not found' };
        }

        const row = result.rows[0];
        const adjudication: Adjudication = {
          id: row.id,
          labelId: row.label_id,
          conflictingReviews: row.conflicting_reviews,
          reason: row.reason,
          assignedTo: row.assigned_to,
          resolution: row.resolution,
          resolutionReasoning: row.resolution_reasoning,
          resolvedBy: row.resolved_by,
          resolvedAt: row.resolved_at,
          createdAt: row.created_at,
          signature: row.signature,
        };

        return adjudication;
      } catch (error) {
        server.log.error(error, 'Failed to get adjudication');
        reply.status(500);
        return { error: 'Failed to retrieve adjudication' };
      }
    },
  );
}
