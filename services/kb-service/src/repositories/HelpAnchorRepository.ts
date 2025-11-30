/**
 * Help Anchor Repository
 * Data access layer for contextual help anchors
 */

import { v4 as uuidv4 } from 'uuid';
import { query, transaction } from '../db/connection.js';
import type {
  HelpAnchor,
  CreateHelpAnchorInput,
  UpdateHelpAnchorInput,
  PaginatedResponse,
} from '../types/index.js';

interface HelpAnchorRow {
  id: string;
  anchor_key: string;
  ui_route: string;
  component_path: string | null;
  description: string | null;
  priority: number;
  created_at: Date;
  updated_at: Date;
}

function mapRowToHelpAnchor(row: HelpAnchorRow, articleIds: string[] = []): HelpAnchor {
  return {
    id: row.id,
    anchorKey: row.anchor_key,
    uiRoute: row.ui_route,
    componentPath: row.component_path ?? undefined,
    description: row.description ?? undefined,
    priority: row.priority,
    articleIds,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class HelpAnchorRepository {
  async findById(id: string): Promise<HelpAnchor | null> {
    const result = await query<HelpAnchorRow>(
      'SELECT * FROM kb_help_anchors WHERE id = $1',
      [id]
    );
    if (!result.rows[0]) return null;

    const articleIds = await this.getAnchorArticleIds(id);
    return mapRowToHelpAnchor(result.rows[0], articleIds);
  }

  async findByAnchorKey(anchorKey: string, uiRoute: string): Promise<HelpAnchor | null> {
    const result = await query<HelpAnchorRow>(
      'SELECT * FROM kb_help_anchors WHERE anchor_key = $1 AND ui_route = $2',
      [anchorKey, uiRoute]
    );
    if (!result.rows[0]) return null;

    const articleIds = await this.getAnchorArticleIds(result.rows[0].id);
    return mapRowToHelpAnchor(result.rows[0], articleIds);
  }

  async findByRoute(uiRoute: string): Promise<HelpAnchor[]> {
    // Match exact route or pattern routes (with :params)
    const result = await query<HelpAnchorRow>(
      `SELECT * FROM kb_help_anchors
       WHERE ui_route = $1
          OR $1 ~ ('^' || regexp_replace(ui_route, ':[^/]+', '[^/]+', 'g') || '$')
       ORDER BY priority DESC, anchor_key`,
      [uiRoute]
    );

    return Promise.all(
      result.rows.map(async (row) => {
        const articleIds = await this.getAnchorArticleIds(row.id);
        return mapRowToHelpAnchor(row, articleIds);
      })
    );
  }

  async findAll(limit = 100, offset = 0): Promise<PaginatedResponse<HelpAnchor>> {
    const [countResult, dataResult] = await Promise.all([
      query<{ count: string }>('SELECT COUNT(*) FROM kb_help_anchors'),
      query<HelpAnchorRow>(
        `SELECT * FROM kb_help_anchors
         ORDER BY ui_route, priority DESC
         LIMIT $1 OFFSET $2`,
        [limit, offset]
      ),
    ]);

    const total = parseInt(countResult.rows[0].count, 10);

    const anchors = await Promise.all(
      dataResult.rows.map(async (row) => {
        const articleIds = await this.getAnchorArticleIds(row.id);
        return mapRowToHelpAnchor(row, articleIds);
      })
    );

    return {
      data: anchors,
      total,
      limit,
      offset,
      hasMore: offset + anchors.length < total,
    };
  }

  async create(input: CreateHelpAnchorInput): Promise<HelpAnchor> {
    return transaction(async (client) => {
      const id = uuidv4();

      const result = await client.query<HelpAnchorRow>(
        `INSERT INTO kb_help_anchors (id, anchor_key, ui_route, component_path, description, priority)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [
          id,
          input.anchorKey,
          input.uiRoute,
          input.componentPath,
          input.description,
          input.priority ?? 50,
        ]
      );

      // Link articles
      if (input.articleIds.length > 0) {
        const values = input.articleIds
          .map((_, i) => `($1, $${i + 2}, ${i})`)
          .join(',');
        await client.query(
          `INSERT INTO kb_help_anchor_articles (anchor_id, article_id, display_order)
           VALUES ${values}`,
          [id, ...input.articleIds]
        );
      }

      return mapRowToHelpAnchor(result.rows[0], input.articleIds);
    });
  }

  async update(id: string, input: UpdateHelpAnchorInput): Promise<HelpAnchor | null> {
    return transaction(async (client) => {
      const fields: string[] = [];
      const values: unknown[] = [];
      let paramIndex = 1;

      if (input.anchorKey !== undefined) {
        fields.push(`anchor_key = $${paramIndex++}`);
        values.push(input.anchorKey);
      }
      if (input.uiRoute !== undefined) {
        fields.push(`ui_route = $${paramIndex++}`);
        values.push(input.uiRoute);
      }
      if (input.componentPath !== undefined) {
        fields.push(`component_path = $${paramIndex++}`);
        values.push(input.componentPath);
      }
      if (input.description !== undefined) {
        fields.push(`description = $${paramIndex++}`);
        values.push(input.description);
      }
      if (input.priority !== undefined) {
        fields.push(`priority = $${paramIndex++}`);
        values.push(input.priority);
      }

      if (fields.length > 0) {
        values.push(id);
        await client.query(
          `UPDATE kb_help_anchors SET ${fields.join(', ')} WHERE id = $${paramIndex}`,
          values
        );
      }

      if (input.articleIds !== undefined) {
        await client.query(
          'DELETE FROM kb_help_anchor_articles WHERE anchor_id = $1',
          [id]
        );

        if (input.articleIds.length > 0) {
          const linkValues = input.articleIds
            .map((_, i) => `($1, $${i + 2}, ${i})`)
            .join(',');
          await client.query(
            `INSERT INTO kb_help_anchor_articles (anchor_id, article_id, display_order)
             VALUES ${linkValues}`,
            [id, ...input.articleIds]
          );
        }
      }

      return this.findById(id);
    });
  }

  async delete(id: string): Promise<boolean> {
    const result = await query('DELETE FROM kb_help_anchors WHERE id = $1', [id]);
    return (result.rowCount ?? 0) > 0;
  }

  async getAnchorArticleIds(anchorId: string): Promise<string[]> {
    const result = await query<{ article_id: string }>(
      `SELECT article_id FROM kb_help_anchor_articles
       WHERE anchor_id = $1
       ORDER BY display_order`,
      [anchorId]
    );
    return result.rows.map((r) => r.article_id);
  }

  async setAnchorArticles(anchorId: string, articleIds: string[]): Promise<void> {
    await transaction(async (client) => {
      await client.query(
        'DELETE FROM kb_help_anchor_articles WHERE anchor_id = $1',
        [anchorId]
      );

      if (articleIds.length > 0) {
        const values = articleIds
          .map((_, i) => `($1, $${i + 2}, ${i})`)
          .join(',');
        await client.query(
          `INSERT INTO kb_help_anchor_articles (anchor_id, article_id, display_order)
           VALUES ${values}`,
          [anchorId, ...articleIds]
        );
      }
    });
  }
}

export const helpAnchorRepository = new HelpAnchorRepository();
