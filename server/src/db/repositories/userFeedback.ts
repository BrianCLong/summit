import { Pool } from 'pg';
import { randomUUID } from 'crypto';
import { getPostgresPool } from '../postgres.js';

export type FeedbackCategory = 'BUG' | 'FEATURE' | 'OTHER';
export type FeedbackStatus = 'NEW' | 'IN_REVIEW' | 'RESOLVED' | 'ARCHIVED';

export interface CreateFeedbackInput {
  tenantId?: string | null;
  userId?: string | null;
  userEmail?: string | null;
  category: FeedbackCategory;
  title: string;
  description?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface FeedbackRecord {
  id: string;
  tenantId: string | null;
  userId: string | null;
  userEmail: string | null;
  category: FeedbackCategory;
  title: string;
  description: string | null;
  status: FeedbackStatus;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface FeedbackListFilters {
  status?: FeedbackStatus;
  category?: FeedbackCategory;
  limit?: number;
  offset?: number;
  tenantId?: string;
}

export class UserFeedbackRepository {
  constructor(private pool: Pool = getPostgresPool()) {}

  async createFeedback(input: CreateFeedbackInput): Promise<FeedbackRecord> {
    const id = randomUUID();
    const metadata = input.metadata ?? {};
    const { rows } = await this.pool.query(
      `INSERT INTO user_feedback (id, tenant_id, user_id, user_email, category, title, description, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, tenant_id AS "tenantId", user_id AS "userId", user_email AS "userEmail",
                 category, title, description, status, metadata,
                 created_at AS "createdAt", updated_at AS "updatedAt"`,
      [
        id,
        input.tenantId ?? null,
        input.userId ?? null,
        input.userEmail ?? null,
        input.category,
        input.title,
        input.description ?? null,
        metadata,
      ],
    );

    return rows[0];
  }

  async listFeedback(filters: FeedbackListFilters = {}): Promise<{ total: number; items: FeedbackRecord[] }> {
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (filters.tenantId) {
      params.push(filters.tenantId);
      conditions.push(`tenant_id = $${params.length}`);
    }

    if (filters.status) {
      params.push(filters.status);
      conditions.push(`status = $${params.length}`);
    }

    if (filters.category) {
      params.push(filters.category);
      conditions.push(`category = $${params.length}`);
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const limit = typeof filters.limit === 'number' ? Math.min(Math.max(filters.limit, 1), 200) : 50;
    const offset = typeof filters.offset === 'number' ? Math.max(filters.offset, 0) : 0;

    const countQuery = `SELECT COUNT(*)::int AS total FROM user_feedback ${whereClause}`;
    const { rows: countRows } = await this.pool.query(countQuery, params);

    params.push(limit);
    params.push(offset);
    const limitParam = `$${params.length - 1}`;
    const offsetParam = `$${params.length}`;

    const dataQuery = `
      SELECT
        id,
        tenant_id AS "tenantId",
        user_id AS "userId",
        user_email AS "userEmail",
        category,
        title,
        description,
        status,
        metadata,
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM user_feedback
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT ${limitParam}
      OFFSET ${offsetParam}
    `;

    const { rows } = await this.pool.query(dataQuery, params);

    return { total: countRows[0]?.total ?? 0, items: rows };
  }

  async updateStatus(id: string, status: FeedbackStatus): Promise<FeedbackRecord | null> {
    const { rows } = await this.pool.query(
      `UPDATE user_feedback
       SET status = $2
       WHERE id = $1
       RETURNING id, tenant_id AS "tenantId", user_id AS "userId", user_email AS "userEmail",
                 category, title, description, status, metadata,
                 created_at AS "createdAt", updated_at AS "updatedAt"`,
      [id, status],
    );

    return rows[0] ?? null;
  }
}

export const userFeedbackRepository = new UserFeedbackRepository();
