/**
 * Tag Repository
 * Data access layer for KB tags
 */

import { v4 as uuidv4 } from 'uuid';
import { query, transaction } from '../db/connection.js';
import type {
  Tag,
  CreateTagInput,
  UpdateTagInput,
  PaginatedResponse,
} from '../types/index.js';

interface TagRow {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  color: string | null;
  category: string | null;
  created_at: Date;
  updated_at: Date;
}

function mapRowToTag(row: TagRow): Tag {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description ?? undefined,
    color: row.color ?? undefined,
    category: row.category ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class TagRepository {
  async findById(id: string): Promise<Tag | null> {
    const result = await query<TagRow>(
      'SELECT * FROM kb_tags WHERE id = $1',
      [id]
    );
    return result.rows[0] ? mapRowToTag(result.rows[0]) : null;
  }

  async findBySlug(slug: string): Promise<Tag | null> {
    const result = await query<TagRow>(
      'SELECT * FROM kb_tags WHERE slug = $1',
      [slug]
    );
    return result.rows[0] ? mapRowToTag(result.rows[0]) : null;
  }

  async findAll(
    limit = 100,
    offset = 0,
    category?: string
  ): Promise<PaginatedResponse<Tag>> {
    let countQuery = 'SELECT COUNT(*) FROM kb_tags';
    let dataQuery = 'SELECT * FROM kb_tags';
    const params: unknown[] = [];

    if (category) {
      countQuery += ' WHERE category = $1';
      dataQuery += ' WHERE category = $1';
      params.push(category);
    }

    dataQuery += ` ORDER BY category, name LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const [countResult, dataResult] = await Promise.all([
      query<{ count: string }>(countQuery, category ? [category] : []),
      query<TagRow>(dataQuery, params),
    ]);

    const total = parseInt(countResult.rows[0].count, 10);

    return {
      data: dataResult.rows.map(mapRowToTag),
      total,
      limit,
      offset,
      hasMore: offset + dataResult.rows.length < total,
    };
  }

  async findByIds(ids: string[]): Promise<Tag[]> {
    if (ids.length === 0) return [];

    const placeholders = ids.map((_, i) => `$${i + 1}`).join(',');
    const result = await query<TagRow>(
      `SELECT * FROM kb_tags WHERE id IN (${placeholders})`,
      ids
    );
    return result.rows.map(mapRowToTag);
  }

  async create(input: CreateTagInput): Promise<Tag> {
    const id = uuidv4();
    const result = await query<TagRow>(
      `INSERT INTO kb_tags (id, name, slug, description, color, category)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [id, input.name, input.slug, input.description, input.color, input.category]
    );
    return mapRowToTag(result.rows[0]);
  }

  async update(id: string, input: UpdateTagInput): Promise<Tag | null> {
    const fields: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (input.name !== undefined) {
      fields.push(`name = $${paramIndex++}`);
      values.push(input.name);
    }
    if (input.slug !== undefined) {
      fields.push(`slug = $${paramIndex++}`);
      values.push(input.slug);
    }
    if (input.description !== undefined) {
      fields.push(`description = $${paramIndex++}`);
      values.push(input.description);
    }
    if (input.color !== undefined) {
      fields.push(`color = $${paramIndex++}`);
      values.push(input.color);
    }
    if (input.category !== undefined) {
      fields.push(`category = $${paramIndex++}`);
      values.push(input.category);
    }

    if (fields.length === 0) {
      return this.findById(id);
    }

    values.push(id);
    const result = await query<TagRow>(
      `UPDATE kb_tags SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );
    return result.rows[0] ? mapRowToTag(result.rows[0]) : null;
  }

  async delete(id: string): Promise<boolean> {
    const result = await query('DELETE FROM kb_tags WHERE id = $1', [id]);
    return (result.rowCount ?? 0) > 0;
  }

  async getArticleTags(articleId: string): Promise<Tag[]> {
    const result = await query<TagRow>(
      `SELECT t.* FROM kb_tags t
       JOIN kb_article_tags at ON t.id = at.tag_id
       WHERE at.article_id = $1
       ORDER BY t.name`,
      [articleId]
    );
    return result.rows.map(mapRowToTag);
  }

  async setArticleTags(articleId: string, tagIds: string[]): Promise<void> {
    await transaction(async (client) => {
      // Remove existing tags
      await client.query(
        'DELETE FROM kb_article_tags WHERE article_id = $1',
        [articleId]
      );

      // Add new tags
      if (tagIds.length > 0) {
        const values = tagIds.map((tagId, i) => `($1, $${i + 2})`).join(',');
        await client.query(
          `INSERT INTO kb_article_tags (article_id, tag_id) VALUES ${values}`,
          [articleId, ...tagIds]
        );
      }
    });
  }
}

export const tagRepository = new TagRepository();
