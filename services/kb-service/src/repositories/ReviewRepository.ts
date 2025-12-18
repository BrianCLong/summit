/**
 * Review Repository
 * Data access layer for KB content review workflow
 */

import { v4 as uuidv4 } from 'uuid';
import { query, transaction } from '../db/connection.js';
import type {
  Review,
  ReviewDecision,
  WorkflowState,
  ContentStatus,
} from '../types/index.js';

interface ReviewRow {
  id: string;
  version_id: string;
  reviewer_id: string;
  decision: ReviewDecision | null;
  comments: string | null;
  requested_at: Date;
  reviewed_at: Date | null;
}

interface PendingReviewRow {
  review_id: string;
  version_id: string;
  reviewer_id: string;
  requested_at: Date;
  article_id: string;
  article_title: string;
  version_number: number;
  author_id: string;
  status: ContentStatus;
}

function mapRowToReview(row: ReviewRow): Review {
  return {
    id: row.id,
    versionId: row.version_id,
    reviewerId: row.reviewer_id,
    decision: row.decision!,
    comments: row.comments ?? undefined,
    reviewedAt: row.reviewed_at!,
  };
}

export class ReviewRepository {
  async findById(id: string): Promise<Review | null> {
    const result = await query<ReviewRow>(
      'SELECT * FROM kb_reviews WHERE id = $1 AND decision IS NOT NULL',
      [id]
    );
    return result.rows[0] ? mapRowToReview(result.rows[0]) : null;
  }

  async findByVersionId(versionId: string): Promise<Review[]> {
    const result = await query<ReviewRow>(
      `SELECT * FROM kb_reviews
       WHERE version_id = $1 AND decision IS NOT NULL
       ORDER BY reviewed_at DESC`,
      [versionId]
    );
    return result.rows.map(mapRowToReview);
  }

  async getPendingReviewsForReviewer(reviewerId: string): Promise<PendingReviewRow[]> {
    const result = await query<PendingReviewRow>(
      `SELECT * FROM kb_pending_reviews WHERE reviewer_id = $1`,
      [reviewerId]
    );
    return result.rows;
  }

  async requestReview(
    versionId: string,
    reviewerIds: string[]
  ): Promise<void> {
    await transaction(async (client) => {
      // Update version status to pending_review
      await client.query(
        `UPDATE kb_versions SET status = 'pending_review'::content_status WHERE id = $1`,
        [versionId]
      );

      // Create review requests
      for (const reviewerId of reviewerIds) {
        const id = uuidv4();
        await client.query(
          `INSERT INTO kb_reviews (id, version_id, reviewer_id)
           VALUES ($1, $2, $3)
           ON CONFLICT (version_id, reviewer_id) DO NOTHING`,
          [id, versionId, reviewerId]
        );
      }
    });
  }

  async submitReview(
    versionId: string,
    reviewerId: string,
    decision: ReviewDecision,
    comments?: string
  ): Promise<Review> {
    const result = await query<ReviewRow>(
      `UPDATE kb_reviews
       SET decision = $1::review_decision, comments = $2, reviewed_at = NOW()
       WHERE version_id = $3 AND reviewer_id = $4
       RETURNING *`,
      [decision, comments, versionId, reviewerId]
    );

    if (!result.rows[0]) {
      throw new Error('Review request not found');
    }

    return mapRowToReview(result.rows[0]);
  }

  async getWorkflowState(versionId: string): Promise<WorkflowState | null> {
    // Get version and article info
    const versionResult = await query<{
      id: string;
      article_id: string;
      status: ContentStatus;
    }>(
      'SELECT id, article_id, status FROM kb_versions WHERE id = $1',
      [versionId]
    );

    if (!versionResult.rows[0]) return null;

    const version = versionResult.rows[0];

    // Get pending reviews
    const pendingResult = await query<{ reviewer_id: string; requested_at: Date }>(
      `SELECT reviewer_id, requested_at FROM kb_reviews
       WHERE version_id = $1 AND decision IS NULL`,
      [versionId]
    );

    // Get completed reviews
    const completedResult = await query<ReviewRow>(
      `SELECT * FROM kb_reviews
       WHERE version_id = $1 AND decision IS NOT NULL`,
      [versionId]
    );

    const pendingReviews = pendingResult.rows.map((row) => ({
      reviewerId: row.reviewer_id,
      requestedAt: row.requested_at,
    }));

    const completedReviews = completedResult.rows.map(mapRowToReview);

    // Can publish if:
    // - No pending reviews
    // - At least one approved review
    // - No rejections
    const hasApproval = completedReviews.some((r) => r.decision === 'approved');
    const hasRejection = completedReviews.some((r) => r.decision === 'rejected');
    const canPublish =
      pendingReviews.length === 0 && hasApproval && !hasRejection;

    return {
      versionId: version.id,
      articleId: version.article_id,
      status: version.status,
      pendingReviews,
      completedReviews,
      canPublish,
    };
  }

  async cancelPendingReviews(versionId: string): Promise<void> {
    await query(
      'DELETE FROM kb_reviews WHERE version_id = $1 AND decision IS NULL',
      [versionId]
    );
  }

  async getReviewHistory(articleId: string): Promise<Review[]> {
    const result = await query<ReviewRow>(
      `SELECT r.* FROM kb_reviews r
       JOIN kb_versions v ON r.version_id = v.id
       WHERE v.article_id = $1 AND r.decision IS NOT NULL
       ORDER BY r.reviewed_at DESC`,
      [articleId]
    );
    return result.rows.map(mapRowToReview);
  }
}

export const reviewRepository = new ReviewRepository();
