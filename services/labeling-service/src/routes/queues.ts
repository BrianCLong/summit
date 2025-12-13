/**
 * Queue endpoints for labeling service
 */

import { FastifyInstance } from 'fastify';
import { Pool } from 'pg';
import {
  CreateQueueSchema,
  QueueStatus,
  AuditEventType,
  UserRole,
  type CreateQueue,
  type Queue,
  type QueueStats,
} from '../types/index.js';
import { generateQueueId } from '../utils/crypto.js';
import { calculateMean } from '../utils/statistics.js';

export async function registerQueueRoutes(
  server: FastifyInstance,
  pool: Pool,
  createAuditEvent: any,
  requireRole: any,
) {
  // Create queue
  server.post<{ Body: CreateQueue }>(
    '/queues',
    {
      schema: { body: CreateQueueSchema },
      preHandler: requireRole(UserRole.ADMIN, UserRole.REVIEWER),
    },
    async (request: any, reply) => {
      try {
        const {
          name,
          description,
          entityType,
          labelType,
          assignedTo,
          requiredReviews,
          metadata,
        } = request.body;

        const id = generateQueueId();
        const createdAt = new Date().toISOString();

        const result = await pool.query(
          `INSERT INTO queues (
            id, name, description, entity_type, label_type,
            assigned_to, required_reviews, status, metadata,
            created_by, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          RETURNING *`,
          [
            id,
            name,
            description,
            entityType,
            labelType,
            assignedTo || [],
            requiredReviews || 2,
            QueueStatus.ACTIVE,
            JSON.stringify(metadata || {}),
            request.userId,
            createdAt,
          ],
        );

        const row = result.rows[0];
        const queue: Queue = {
          id: row.id,
          name: row.name,
          description: row.description,
          entityType: row.entity_type,
          labelType: row.label_type,
          assignedTo: row.assigned_to,
          requiredReviews: row.required_reviews,
          status: row.status,
          metadata: row.metadata,
          createdBy: row.created_by,
          createdAt: row.created_at,
          completedAt: row.completed_at,
        };

        // Create audit event
        await createAuditEvent({
          eventType: AuditEventType.QUEUE_CREATED,
          userId: request.userId,
          queueId: id,
          afterState: queue,
        });

        server.log.info(
          { queueId: id, userId: request.userId },
          'Queue created',
        );

        return queue;
      } catch (error) {
        server.log.error(error, 'Failed to create queue');
        reply.status(500);
        return { error: 'Failed to create queue' };
      }
    },
  );

  // Get queue by ID
  server.get<{ Params: { id: string } }>(
    '/queues/:id',
    async (request: any, reply) => {
      try {
        const { id } = request.params;

        const result = await pool.query('SELECT * FROM queues WHERE id = $1', [
          id,
        ]);

        if (result.rows.length === 0) {
          reply.status(404);
          return { error: 'Queue not found' };
        }

        const row = result.rows[0];
        const queue: Queue = {
          id: row.id,
          name: row.name,
          description: row.description,
          entityType: row.entity_type,
          labelType: row.label_type,
          assignedTo: row.assigned_to,
          requiredReviews: row.required_reviews,
          status: row.status,
          metadata: row.metadata,
          createdBy: row.created_by,
          createdAt: row.created_at,
          completedAt: row.completed_at,
        };

        return queue;
      } catch (error) {
        server.log.error(error, 'Failed to get queue');
        reply.status(500);
        return { error: 'Failed to retrieve queue' };
      }
    },
  );

  // List queues
  server.get<{
    Querystring: {
      status?: QueueStatus;
      assignedTo?: string;
      limit?: number;
      offset?: number;
    };
  }>('/queues', async (request: any, reply) => {
    try {
      const { status, assignedTo, limit = 50, offset = 0 } = request.query;

      let query = 'SELECT * FROM queues WHERE 1=1';
      const params: any[] = [];

      if (status) {
        params.push(status);
        query += ` AND status = $${params.length}`;
      }
      if (assignedTo) {
        params.push(assignedTo);
        query += ` AND $${params.length} = ANY(assigned_to)`;
      }

      query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
      params.push(limit, offset);

      const result = await pool.query(query, params);

      const queues: Queue[] = result.rows.map((row) => ({
        id: row.id,
        name: row.name,
        description: row.description,
        entityType: row.entity_type,
        labelType: row.label_type,
        assignedTo: row.assigned_to,
        requiredReviews: row.required_reviews,
        status: row.status,
        metadata: row.metadata,
        createdBy: row.created_by,
        createdAt: row.created_at,
        completedAt: row.completed_at,
      }));

      return { queues, total: queues.length, offset, limit };
    } catch (error) {
      server.log.error(error, 'Failed to list queues');
      reply.status(500);
      return { error: 'Failed to list queues' };
    }
  });

  // Assign label to queue
  server.post<{ Body: { labelId: string; queueId: string } }>(
    '/queues/assign',
    {
      preHandler: requireRole(UserRole.ADMIN, UserRole.REVIEWER),
    },
    async (request: any, reply) => {
      try {
        const { labelId, queueId } = request.body;

        // Verify queue exists
        const queueResult = await pool.query(
          'SELECT * FROM queues WHERE id = $1',
          [queueId],
        );

        if (queueResult.rows.length === 0) {
          reply.status(404);
          return { error: 'Queue not found' };
        }

        // Update label
        await pool.query('UPDATE labels SET queue_id = $1 WHERE id = $2', [
          queueId,
          labelId,
        ]);

        // Create audit event
        await createAuditEvent({
          eventType: AuditEventType.QUEUE_ASSIGNED,
          userId: request.userId,
          labelId,
          queueId,
        });

        server.log.info(
          { labelId, queueId, userId: request.userId },
          'Label assigned to queue',
        );

        return { success: true, labelId, queueId };
      } catch (error) {
        server.log.error(error, 'Failed to assign label to queue');
        reply.status(500);
        return { error: 'Failed to assign label to queue' };
      }
    },
  );

  // Get queue statistics
  server.get<{ Params: { id: string } }>(
    '/queues/:id/stats',
    async (request: any, reply) => {
      try {
        const { id } = request.params;

        // Get label counts by status
        const statsResult = await pool.query(
          `SELECT
            COUNT(*) as total,
            COUNT(*) FILTER (WHERE status = 'pending') as pending,
            COUNT(*) FILTER (WHERE status = 'approved') as approved,
            COUNT(*) FILTER (WHERE status = 'rejected') as rejected,
            COUNT(*) FILTER (WHERE status = 'needs_adjudication') as needs_adjudication
          FROM labels
          WHERE queue_id = $1`,
          [id],
        );

        const stats = statsResult.rows[0];

        // Calculate average time to review
        const timeResult = await pool.query(
          `SELECT
            EXTRACT(EPOCH FROM (reviewed_at - created_at)) as review_time_seconds
          FROM labels
          WHERE queue_id = $1 AND reviewed_at IS NOT NULL`,
          [id],
        );

        const reviewTimes = timeResult.rows.map((row) =>
          parseFloat(row.review_time_seconds),
        );
        const avgTimeToReview =
          reviewTimes.length > 0 ? calculateMean(reviewTimes) : 0;

        const total = parseInt(stats.total);
        const approved = parseInt(stats.approved);
        const completionRate = total > 0 ? (approved / total) * 100 : 0;

        const queueStats: QueueStats = {
          queueId: id,
          totalLabels: total,
          pendingLabels: parseInt(stats.pending),
          approvedLabels: approved,
          rejectedLabels: parseInt(stats.rejected),
          needsAdjudication: parseInt(stats.needs_adjudication),
          avgTimeToReview,
          completionRate,
        };

        return queueStats;
      } catch (error) {
        server.log.error(error, 'Failed to get queue stats');
        reply.status(500);
        return { error: 'Failed to retrieve queue statistics' };
      }
    },
  );

  // Update queue status
  server.patch<{ Params: { id: string }; Body: { status: QueueStatus } }>(
    '/queues/:id/status',
    {
      preHandler: requireRole(UserRole.ADMIN),
    },
    async (request: any, reply) => {
      try {
        const { id } = request.params;
        const { status } = request.body;

        const completedAt =
          status === QueueStatus.COMPLETED ? new Date().toISOString() : null;

        await pool.query(
          'UPDATE queues SET status = $1, completed_at = $2 WHERE id = $3',
          [status, completedAt, id],
        );

        server.log.info(
          { queueId: id, status, userId: request.userId },
          'Queue status updated',
        );

        return { success: true, queueId: id, status };
      } catch (error) {
        server.log.error(error, 'Failed to update queue status');
        reply.status(500);
        return { error: 'Failed to update queue status' };
      }
    },
  );
}
