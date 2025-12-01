import { v4 as uuidv4 } from 'uuid';
import { db } from '../utils/db.js';
import { logger } from '../utils/logger.js';
import { providerService } from './providerService.js';
import { transactionService } from './transactionService.js';

export interface Review {
  id: string;
  transactionId: string;
  productId: string;
  providerId: string;
  reviewerId: string;
  overallRating: number;
  qualityRating?: number;
  accuracyRating?: number;
  documentationRating?: number;
  supportRating?: number;
  title?: string;
  content?: string;
  status: 'pending' | 'approved' | 'rejected' | 'flagged';
  helpfulCount: number;
  verifiedPurchase: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export const reviewService = {
  async submit(params: {
    transactionId: string;
    reviewerId: string;
    overallRating: number;
    qualityRating?: number;
    accuracyRating?: number;
    title?: string;
    content?: string;
  }): Promise<Review> {
    // Verify transaction exists and is completed
    const transaction = await transactionService.findById(params.transactionId);
    if (!transaction) {
      throw new Error('Transaction not found');
    }
    if (transaction.status !== 'completed') {
      throw new Error('Can only review completed transactions');
    }
    if (transaction.buyerId !== params.reviewerId) {
      throw new Error('Only the buyer can review this transaction');
    }

    // Check if review already exists
    const existing = await db.query(
      'SELECT id FROM reviews WHERE transaction_id = $1',
      [params.transactionId]
    );
    if (existing.rows.length > 0) {
      throw new Error('Review already exists for this transaction');
    }

    const id = uuidv4();
    const now = new Date();

    const review: Review = {
      id,
      transactionId: params.transactionId,
      productId: transaction.productId,
      providerId: transaction.sellerId,
      reviewerId: params.reviewerId,
      overallRating: params.overallRating,
      qualityRating: params.qualityRating,
      accuracyRating: params.accuracyRating,
      title: params.title,
      content: params.content,
      status: 'pending',
      helpfulCount: 0,
      verifiedPurchase: true,
      createdAt: now,
      updatedAt: now,
    };

    await db.query(
      `INSERT INTO reviews (
        id, transaction_id, product_id, provider_id, reviewer_id,
        overall_rating, quality_rating, accuracy_rating,
        title, content, status, helpful_count, verified_purchase,
        created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
      [
        review.id,
        review.transactionId,
        review.productId,
        review.providerId,
        review.reviewerId,
        review.overallRating,
        review.qualityRating,
        review.accuracyRating,
        review.title,
        review.content,
        review.status,
        review.helpfulCount,
        review.verifiedPurchase,
        review.createdAt,
        review.updatedAt,
      ]
    );

    // Auto-approve reviews (in production, may require moderation)
    await this.approve(id);

    logger.info('Review submitted', {
      reviewId: id,
      transactionId: params.transactionId,
      rating: params.overallRating,
    });

    return review;
  },

  async approve(id: string): Promise<Review | null> {
    const result = await db.query(
      `UPDATE reviews
       SET status = 'approved', updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id]
    );

    if (result.rows[0]) {
      const review = mapRowToReview(result.rows[0]);
      // Update provider rating
      await providerService.updateRating(review.providerId);
      return review;
    }
    return null;
  },

  async reject(id: string, reason: string): Promise<Review | null> {
    const result = await db.query(
      `UPDATE reviews
       SET status = 'rejected', moderation_notes = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [reason, id]
    );
    return result.rows[0] ? mapRowToReview(result.rows[0]) : null;
  },

  async markHelpful(id: string): Promise<Review | null> {
    const result = await db.query(
      `UPDATE reviews
       SET helpful_count = helpful_count + 1, updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id]
    );
    return result.rows[0] ? mapRowToReview(result.rows[0]) : null;
  },

  async findByProduct(
    productId: string,
    options: { limit?: number; offset?: number; status?: string } = {}
  ): Promise<{ reviews: Review[]; total: number }> {
    const conditions = ['product_id = $1'];
    const values: unknown[] = [productId];
    let paramIndex = 2;

    if (options.status) {
      conditions.push(`status = $${paramIndex}`);
      values.push(options.status);
      paramIndex++;
    } else {
      conditions.push("status = 'approved'");
    }

    const whereClause = conditions.join(' AND ');
    const limit = options.limit || 20;
    const offset = options.offset || 0;

    const countResult = await db.query(
      `SELECT COUNT(*) FROM reviews WHERE ${whereClause}`,
      values
    );

    const result = await db.query(
      `SELECT * FROM reviews WHERE ${whereClause}
       ORDER BY helpful_count DESC, created_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...values, limit, offset]
    );

    return {
      reviews: result.rows.map(mapRowToReview),
      total: parseInt(countResult.rows[0].count, 10),
    };
  },

  async findByProvider(providerId: string): Promise<Review[]> {
    const result = await db.query(
      `SELECT * FROM reviews
       WHERE provider_id = $1 AND status = 'approved'
       ORDER BY created_at DESC
       LIMIT 50`,
      [providerId]
    );
    return result.rows.map(mapRowToReview);
  },

  async getAverageRating(productId: string): Promise<{
    average: number;
    count: number;
    distribution: Record<number, number>;
  } | null> {
    const result = await db.query(
      `SELECT
         AVG(overall_rating)::DECIMAL(3,2) as average,
         COUNT(*) as count,
         COUNT(*) FILTER (WHERE overall_rating = 1) as r1,
         COUNT(*) FILTER (WHERE overall_rating = 2) as r2,
         COUNT(*) FILTER (WHERE overall_rating = 3) as r3,
         COUNT(*) FILTER (WHERE overall_rating = 4) as r4,
         COUNT(*) FILTER (WHERE overall_rating = 5) as r5
       FROM reviews
       WHERE product_id = $1 AND status = 'approved'`,
      [productId]
    );

    if (!result.rows[0] || result.rows[0].count === '0') {
      return null;
    }

    const row = result.rows[0];
    return {
      average: parseFloat(row.average),
      count: parseInt(row.count, 10),
      distribution: {
        1: parseInt(row.r1, 10),
        2: parseInt(row.r2, 10),
        3: parseInt(row.r3, 10),
        4: parseInt(row.r4, 10),
        5: parseInt(row.r5, 10),
      },
    };
  },
};

function mapRowToReview(row: Record<string, unknown>): Review {
  return {
    id: row.id as string,
    transactionId: row.transaction_id as string,
    productId: row.product_id as string,
    providerId: row.provider_id as string,
    reviewerId: row.reviewer_id as string,
    overallRating: row.overall_rating as number,
    qualityRating: row.quality_rating as number | undefined,
    accuracyRating: row.accuracy_rating as number | undefined,
    documentationRating: row.documentation_rating as number | undefined,
    supportRating: row.support_rating as number | undefined,
    title: row.title as string | undefined,
    content: row.content as string | undefined,
    status: row.status as Review['status'],
    helpfulCount: row.helpful_count as number,
    verifiedPurchase: row.verified_purchase as boolean,
    createdAt: row.created_at as Date,
    updatedAt: row.updated_at as Date,
  };
}
