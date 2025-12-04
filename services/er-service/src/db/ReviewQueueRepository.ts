/**
 * Review Queue Repository
 *
 * Data access layer for human review queue items.
 */

import { v4 as uuidv4 } from 'uuid';
import pino from 'pino';
import type {
  ReviewQueueItem,
  ReviewStatus,
  ReviewPriority,
  EntityType,
  FeatureEvidence,
  MatchDecision,
} from '../types/index.js';
import { getDatabase } from './connection.js';

const logger = pino({ name: 'ReviewQueueRepository' });

export interface CreateReviewItemInput {
  tenantId: string;
  entityType: EntityType;
  nodeAId: string;
  nodeBId: string;
  nodeASnapshot: Record<string, unknown>;
  nodeBSnapshot: Record<string, unknown>;
  matchScore: number;
  features: FeatureEvidence[];
  priority: ReviewPriority;
  conflictingAttributes: string[];
  sharedRelationships: number;
  dueAt?: string;
}

export interface ReviewQueueSearchCriteria {
  tenantId: string;
  status?: ReviewStatus;
  entityType?: EntityType;
  priority?: ReviewPriority;
  assignedTo?: string;
  limit?: number;
  offset?: number;
}

export class ReviewQueueRepository {
  /**
   * Create a new review queue item
   */
  async create(input: CreateReviewItemInput): Promise<ReviewQueueItem> {
    const db = getDatabase();
    const reviewId = uuidv4();
    const now = new Date().toISOString();

    const item: ReviewQueueItem = {
      reviewId,
      tenantId: input.tenantId,
      entityType: input.entityType,
      nodeAId: input.nodeAId,
      nodeBId: input.nodeBId,
      nodeASnapshot: input.nodeASnapshot,
      nodeBSnapshot: input.nodeBSnapshot,
      matchScore: input.matchScore,
      features: input.features,
      status: 'PENDING',
      priority: input.priority,
      dueAt: input.dueAt,
      createdAt: now,
      updatedAt: now,
      conflictingAttributes: input.conflictingAttributes,
      sharedRelationships: input.sharedRelationships,
    };

    await db.execute(
      `INSERT INTO er_review_queue (
        review_id, tenant_id, entity_type, node_a_id, node_b_id,
        node_a_snapshot, node_b_snapshot, match_score, features,
        status, priority, due_at, created_at, updated_at,
        conflicting_attributes, shared_relationships
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
      [
        item.reviewId,
        item.tenantId,
        item.entityType,
        item.nodeAId,
        item.nodeBId,
        JSON.stringify(item.nodeASnapshot),
        JSON.stringify(item.nodeBSnapshot),
        item.matchScore,
        JSON.stringify(item.features),
        item.status,
        item.priority,
        item.dueAt ?? null,
        item.createdAt,
        item.updatedAt,
        JSON.stringify(item.conflictingAttributes),
        item.sharedRelationships,
      ]
    );

    logger.info({ reviewId, entityType: item.entityType, priority: item.priority }, 'Review item created');
    return item;
  }

  /**
   * Get a review item by ID
   */
  async getById(reviewId: string): Promise<ReviewQueueItem | null> {
    const db = getDatabase();
    const row = await db.queryOne<ReviewRow>(
      `SELECT * FROM er_review_queue WHERE review_id = $1`,
      [reviewId]
    );

    if (!row) return null;
    return this.rowToItem(row);
  }

  /**
   * Check if a review item exists for a node pair
   */
  async existsForPair(nodeAId: string, nodeBId: string): Promise<boolean> {
    const db = getDatabase();
    const result = await db.queryOne<{ exists: boolean }>(
      `SELECT EXISTS(
        SELECT 1 FROM er_review_queue
        WHERE (node_a_id = $1 AND node_b_id = $2) OR (node_a_id = $2 AND node_b_id = $1)
        AND status IN ('PENDING', 'IN_REVIEW')
      ) as exists`,
      [nodeAId, nodeBId]
    );

    return result?.exists ?? false;
  }

  /**
   * Search the review queue
   */
  async search(criteria: ReviewQueueSearchCriteria): Promise<ReviewQueueItem[]> {
    const db = getDatabase();
    const conditions: string[] = ['tenant_id = $1'];
    const params: unknown[] = [criteria.tenantId];
    let paramIndex = 2;

    if (criteria.status) {
      conditions.push(`status = $${paramIndex++}`);
      params.push(criteria.status);
    }

    if (criteria.entityType) {
      conditions.push(`entity_type = $${paramIndex++}`);
      params.push(criteria.entityType);
    }

    if (criteria.priority) {
      conditions.push(`priority = $${paramIndex++}`);
      params.push(criteria.priority);
    }

    if (criteria.assignedTo) {
      conditions.push(`assigned_to = $${paramIndex++}`);
      params.push(criteria.assignedTo);
    }

    const limit = criteria.limit ?? 50;
    const offset = criteria.offset ?? 0;

    // Order by priority (CRITICAL first) and due date
    const sql = `
      SELECT * FROM er_review_queue
      WHERE ${conditions.join(' AND ')}
      ORDER BY
        CASE priority
          WHEN 'CRITICAL' THEN 1
          WHEN 'HIGH' THEN 2
          WHEN 'MEDIUM' THEN 3
          ELSE 4
        END,
        due_at NULLS LAST,
        created_at
      LIMIT $${paramIndex++} OFFSET $${paramIndex}
    `;
    params.push(limit, offset);

    const rows = await db.query<ReviewRow>(sql, params);
    return rows.map((row) => this.rowToItem(row));
  }

  /**
   * Assign a review item to a user
   */
  async assign(reviewId: string, assignedTo: string): Promise<void> {
    const db = getDatabase();
    await db.execute(
      `UPDATE er_review_queue
       SET assigned_to = $1, status = 'IN_REVIEW', updated_at = $2
       WHERE review_id = $3 AND status = 'PENDING'`,
      [assignedTo, new Date().toISOString(), reviewId]
    );

    logger.info({ reviewId, assignedTo }, 'Review item assigned');
  }

  /**
   * Record a decision on a review item
   */
  async decide(
    reviewId: string,
    decision: MatchDecision,
    decidedBy: string,
    notes?: string
  ): Promise<ReviewQueueItem | null> {
    const db = getDatabase();
    const now = new Date().toISOString();

    await db.execute(
      `UPDATE er_review_queue
       SET decision = $1, decided_by = $2, decided_at = $3, notes = $4,
           status = 'APPROVED', updated_at = $5
       WHERE review_id = $6`,
      [decision, decidedBy, now, notes ?? null, now, reviewId]
    );

    logger.info({ reviewId, decision, decidedBy }, 'Review decision recorded');
    return this.getById(reviewId);
  }

  /**
   * Escalate a review item
   */
  async escalate(reviewId: string, reason: string): Promise<void> {
    const db = getDatabase();
    await db.execute(
      `UPDATE er_review_queue
       SET status = 'ESCALATED', notes = COALESCE(notes, '') || $1, updated_at = $2
       WHERE review_id = $3`,
      [`\n[ESCALATED] ${reason}`, new Date().toISOString(), reviewId]
    );

    logger.info({ reviewId, reason }, 'Review item escalated');
  }

  /**
   * Get queue statistics
   */
  async getStats(tenantId: string): Promise<{
    pending: number;
    inReview: number;
    approved: number;
    rejected: number;
    escalated: number;
    avgProcessingTimeHours: number;
  }> {
    const db = getDatabase();
    const result = await db.queryOne<{
      pending: string;
      in_review: string;
      approved: string;
      rejected: string;
      escalated: string;
      avg_processing_hours: string;
    }>(
      `SELECT
        COUNT(*) FILTER (WHERE status = 'PENDING') as pending,
        COUNT(*) FILTER (WHERE status = 'IN_REVIEW') as in_review,
        COUNT(*) FILTER (WHERE status = 'APPROVED') as approved,
        COUNT(*) FILTER (WHERE status = 'REJECTED') as rejected,
        COUNT(*) FILTER (WHERE status = 'ESCALATED') as escalated,
        AVG(EXTRACT(EPOCH FROM (decided_at::timestamp - created_at::timestamp)) / 3600)
          FILTER (WHERE decided_at IS NOT NULL) as avg_processing_hours
      FROM er_review_queue
      WHERE tenant_id = $1`,
      [tenantId]
    );

    return {
      pending: parseInt(result?.pending ?? '0', 10),
      inReview: parseInt(result?.in_review ?? '0', 10),
      approved: parseInt(result?.approved ?? '0', 10),
      rejected: parseInt(result?.rejected ?? '0', 10),
      escalated: parseInt(result?.escalated ?? '0', 10),
      avgProcessingTimeHours: parseFloat(result?.avg_processing_hours ?? '0'),
    };
  }

  /**
   * Delete old completed review items
   */
  async cleanup(olderThanDays: number): Promise<number> {
    const db = getDatabase();
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - olderThanDays);

    const result = await db.execute(
      `DELETE FROM er_review_queue
       WHERE status IN ('APPROVED', 'REJECTED')
       AND decided_at < $1`,
      [cutoff.toISOString()]
    );

    logger.info({ deletedCount: result, olderThanDays }, 'Review queue cleanup completed');
    return result;
  }

  private rowToItem(row: ReviewRow): ReviewQueueItem {
    return {
      reviewId: row.review_id,
      tenantId: row.tenant_id,
      entityType: row.entity_type,
      nodeAId: row.node_a_id,
      nodeBId: row.node_b_id,
      nodeASnapshot: row.node_a_snapshot,
      nodeBSnapshot: row.node_b_snapshot,
      matchScore: row.match_score,
      features: row.features,
      status: row.status,
      priority: row.priority,
      assignedTo: row.assigned_to ?? undefined,
      dueAt: row.due_at ?? undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      decision: row.decision ?? undefined,
      decidedBy: row.decided_by ?? undefined,
      decidedAt: row.decided_at ?? undefined,
      notes: row.notes ?? undefined,
      conflictingAttributes: row.conflicting_attributes,
      sharedRelationships: row.shared_relationships,
    };
  }
}

interface ReviewRow {
  review_id: string;
  tenant_id: string;
  entity_type: EntityType;
  node_a_id: string;
  node_b_id: string;
  node_a_snapshot: Record<string, unknown>;
  node_b_snapshot: Record<string, unknown>;
  match_score: number;
  features: FeatureEvidence[];
  status: ReviewStatus;
  priority: ReviewPriority;
  assigned_to: string | null;
  due_at: string | null;
  created_at: string;
  updated_at: string;
  decision: MatchDecision | null;
  decided_by: string | null;
  decided_at: string | null;
  notes: string | null;
  conflicting_attributes: string[];
  shared_relationships: number;
}

export const reviewQueueRepository = new ReviewQueueRepository();
