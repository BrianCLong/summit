/**
 * @fileoverview Universal Comment Service
 *
 * Manages threaded comments across the platform.
 *
 * @module comments/CommentService
 */

import { Pool } from 'pg';
import { randomUUID } from 'crypto';
import { Comment, CreateCommentInput } from './types.js';

export class UniversalCommentService {
  private readonly tableName = 'maestro.comments';

  constructor(private readonly pool: Pool) {}

  /**
   * Post a new comment
   */
  async createComment(input: CreateCommentInput, authorId: string, tenantId: string): Promise<Comment> {
    const commentId = randomUUID();
    const now = new Date().toISOString();

    // Extract mentions (simple regex for @userId, in real world might need better parsing)
    const mentions = (input.content.match(/@\[([a-zA-Z0-9-]+)\]/g) || [])
      .map(m => m.replace(/@\[|\]/g, ''));

    // Determine rootId
    let rootId = input.parentId; // Default to parent being root if parent exists
    if (input.parentId) {
      // Fetch parent to get its rootId
      const parentRes = await this.pool.query(
        `SELECT root_id, comment_id FROM ${this.tableName} WHERE comment_id = $1`,
        [input.parentId]
      );
      if (parentRes.rows.length > 0) {
        rootId = parentRes.rows[0].root_id || parentRes.rows[0].comment_id;
      }
    }

    const query = `
      INSERT INTO ${this.tableName} (
        comment_id, tenant_id, target_type, target_id,
        parent_id, root_id, content, author_id,
        created_at, updated_at, mentions, is_edited, is_deleted, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *
    `;

    const values = [
      commentId, tenantId, input.targetType, input.targetId,
      input.parentId || null, rootId || null, input.content, authorId,
      now, now, mentions, false, false, JSON.stringify(input.metadata || {})
    ];

    const result = await this.pool.query(query, values);
    return this.mapRow(result.rows[0]);
  }

  /**
   * Get comments for a target
   */
  async getComments(targetId: string, targetType: string): Promise<Comment[]> {
    const query = `
      SELECT * FROM ${this.tableName}
      WHERE target_id = $1 AND target_type = $2
      ORDER BY created_at ASC
    `;

    const result = await this.pool.query(query, [targetId, targetType]);
    return result.rows.map(this.mapRow);
  }

  private mapRow(row: any): Comment {
    return {
      commentId: row.comment_id,
      tenantId: row.tenant_id,
      targetType: row.target_type,
      targetId: row.target_id,
      parentId: row.parent_id,
      rootId: row.root_id,
      content: row.content,
      authorId: row.author_id,
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at.toISOString(),
      mentions: row.mentions || [],
      isEdited: row.is_edited,
      isDeleted: row.is_deleted,
      metadata: row.metadata || {}
    };
  }
}
