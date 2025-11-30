/**
 * Audience Repository
 * Data access layer for KB audiences (role-based content access)
 */

import { v4 as uuidv4 } from 'uuid';
import { query, transaction } from '../db/connection.js';
import type {
  Audience,
  AudienceRole,
  CreateAudienceInput,
  UpdateAudienceInput,
  PaginatedResponse,
} from '../types/index.js';

interface AudienceRow {
  id: string;
  name: string;
  roles: AudienceRole[];
  description: string | null;
  created_at: Date;
  updated_at: Date;
}

function mapRowToAudience(row: AudienceRow): Audience {
  return {
    id: row.id,
    name: row.name,
    roles: row.roles,
    description: row.description ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class AudienceRepository {
  async findById(id: string): Promise<Audience | null> {
    const result = await query<AudienceRow>(
      'SELECT * FROM kb_audiences WHERE id = $1',
      [id]
    );
    return result.rows[0] ? mapRowToAudience(result.rows[0]) : null;
  }

  async findByName(name: string): Promise<Audience | null> {
    const result = await query<AudienceRow>(
      'SELECT * FROM kb_audiences WHERE name = $1',
      [name]
    );
    return result.rows[0] ? mapRowToAudience(result.rows[0]) : null;
  }

  async findAll(limit = 100, offset = 0): Promise<PaginatedResponse<Audience>> {
    const [countResult, dataResult] = await Promise.all([
      query<{ count: string }>('SELECT COUNT(*) FROM kb_audiences'),
      query<AudienceRow>(
        'SELECT * FROM kb_audiences ORDER BY name LIMIT $1 OFFSET $2',
        [limit, offset]
      ),
    ]);

    const total = parseInt(countResult.rows[0].count, 10);

    return {
      data: dataResult.rows.map(mapRowToAudience),
      total,
      limit,
      offset,
      hasMore: offset + dataResult.rows.length < total,
    };
  }

  async findByRole(role: AudienceRole): Promise<Audience[]> {
    const result = await query<AudienceRow>(
      `SELECT * FROM kb_audiences WHERE $1 = ANY(roles) OR 'all' = ANY(roles) ORDER BY name`,
      [role]
    );
    return result.rows.map(mapRowToAudience);
  }

  async findByIds(ids: string[]): Promise<Audience[]> {
    if (ids.length === 0) return [];

    const placeholders = ids.map((_, i) => `$${i + 1}`).join(',');
    const result = await query<AudienceRow>(
      `SELECT * FROM kb_audiences WHERE id IN (${placeholders})`,
      ids
    );
    return result.rows.map(mapRowToAudience);
  }

  async create(input: CreateAudienceInput): Promise<Audience> {
    const id = uuidv4();
    const result = await query<AudienceRow>(
      `INSERT INTO kb_audiences (id, name, roles, description)
       VALUES ($1, $2, $3::audience_role[], $4)
       RETURNING *`,
      [id, input.name, input.roles, input.description]
    );
    return mapRowToAudience(result.rows[0]);
  }

  async update(id: string, input: UpdateAudienceInput): Promise<Audience | null> {
    const fields: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (input.name !== undefined) {
      fields.push(`name = $${paramIndex++}`);
      values.push(input.name);
    }
    if (input.roles !== undefined) {
      fields.push(`roles = $${paramIndex++}::audience_role[]`);
      values.push(input.roles);
    }
    if (input.description !== undefined) {
      fields.push(`description = $${paramIndex++}`);
      values.push(input.description);
    }

    if (fields.length === 0) {
      return this.findById(id);
    }

    values.push(id);
    const result = await query<AudienceRow>(
      `UPDATE kb_audiences SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );
    return result.rows[0] ? mapRowToAudience(result.rows[0]) : null;
  }

  async delete(id: string): Promise<boolean> {
    const result = await query('DELETE FROM kb_audiences WHERE id = $1', [id]);
    return (result.rowCount ?? 0) > 0;
  }

  async getArticleAudiences(articleId: string): Promise<Audience[]> {
    const result = await query<AudienceRow>(
      `SELECT a.* FROM kb_audiences a
       JOIN kb_article_audiences aa ON a.id = aa.audience_id
       WHERE aa.article_id = $1
       ORDER BY a.name`,
      [articleId]
    );
    return result.rows.map(mapRowToAudience);
  }

  async setArticleAudiences(articleId: string, audienceIds: string[]): Promise<void> {
    await transaction(async (client) => {
      // Remove existing audiences
      await client.query(
        'DELETE FROM kb_article_audiences WHERE article_id = $1',
        [articleId]
      );

      // Add new audiences
      if (audienceIds.length > 0) {
        const values = audienceIds.map((id, i) => `($1, $${i + 2})`).join(',');
        await client.query(
          `INSERT INTO kb_article_audiences (article_id, audience_id) VALUES ${values}`,
          [articleId, ...audienceIds]
        );
      }
    });
  }

  async canUserAccessArticle(articleId: string, userRole: AudienceRole): Promise<boolean> {
    const result = await query<{ can_access: boolean }>(
      `SELECT EXISTS(
        SELECT 1 FROM kb_article_audiences aa
        JOIN kb_audiences a ON aa.audience_id = a.id
        WHERE aa.article_id = $1
          AND ($2 = ANY(a.roles) OR 'all' = ANY(a.roles))
      ) AS can_access`,
      [articleId, userRole]
    );
    return result.rows[0]?.can_access ?? false;
  }
}

export const audienceRepository = new AudienceRepository();
