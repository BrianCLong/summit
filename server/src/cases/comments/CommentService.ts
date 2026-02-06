import { Pool } from 'pg';
import { randomUUID } from 'node:crypto';

export interface Comment {
  commentId: string;
  tenantId: string;
  targetType: string;
  targetId: string;
  parentId?: string;
  rootId?: string;
  content: string;
  authorId: string;
  createdAt: Date;
  updatedAt: Date;
  mentions: string[];
  isEdited: boolean;
  isDeleted: boolean;
  metadata: Record<string, any>;
}

export interface AddCommentInput {
  tenantId: string;
  targetType: 'NODE' | 'CASE' | 'TASK' | 'DOCUMENT';
  targetId: string;
  parentId?: string;
  content: string;
  authorId: string;
  mentions?: string[];
  metadata?: Record<string, any>;
}

export class CommentService {
  private readonly tableName = 'maestro.comments';

  constructor(private readonly pool: Pool) {}

  /**
   * Add a new comment to a target
   */
  async addComment(input: AddCommentInput): Promise<Comment> {
    const commentId = randomUUID();
    let rootId: string = commentId;

    if (input.parentId) {
      const parent = await this.getComment(input.parentId);
      if (parent) {
        rootId = parent.rootId || parent.commentId;
      }
    }

    const query = `
      INSERT INTO ${this.tableName} (
        comment_id, tenant_id, target_type, target_id,
        parent_id, root_id, content, author_id,
        mentions, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;

    const values = [
      commentId,
      input.tenantId,
      input.targetType,
      input.targetId,
      input.parentId || null,
      rootId,
      input.content,
      input.authorId,
      input.mentions || [],
      JSON.stringify(input.metadata || {}),
    ];

    const { rows } = await this.pool.query(query, values);
    return this.mapRow(rows[0]);
  }

  /**
   * Get a single comment by ID
   */
  async getComment(commentId: string): Promise<Comment | null> {
    const { rows } = await this.pool.query(
      `SELECT * FROM ${this.tableName} WHERE comment_id = $1`,
      [commentId],
    );
    return rows[0] ? this.mapRow(rows[0]) : null;
  }

  /**
   * List comments for a target
   */
  async listComments(params: {
    targetType: string;
    targetId: string;
    tenantId: string;
    limit?: number;
    offset?: number;
  }): Promise<Comment[]> {
    const { targetType, targetId, tenantId, limit = 50, offset = 0 } = params;

    const query = `
      SELECT * FROM ${this.tableName}
      WHERE target_type = $1 AND target_id = $2 AND tenant_id = $3 AND is_deleted = FALSE
      ORDER BY created_at ASC
      LIMIT $4 OFFSET $5
    `;

    const { rows } = await this.pool.query(query, [
      targetType,
      targetId,
      tenantId,
      limit,
      offset,
    ]);
    return rows.map(this.mapRow);
  }

  /**
   * Update a comment
   */
  async updateComment(
    commentId: string,
    content: string,
    userId: string,
  ): Promise<Comment | null> {
    const query = `
      UPDATE ${this.tableName}
      SET content = $2, is_edited = TRUE, updated_at = NOW()
      WHERE comment_id = $1 AND author_id = $3
      RETURNING *
    `;

    const { rows } = await this.pool.query(query, [commentId, content, userId]);
    return rows[0] ? this.mapRow(rows[0]) : null;
  }

  /**
   * Soft delete a comment
   */
  async deleteComment(commentId: string, userId: string): Promise<boolean> {
    const query = `
      UPDATE ${this.tableName}
      SET is_deleted = TRUE, updated_at = NOW()
      WHERE comment_id = $1 AND author_id = $2
    `;

    const { rowCount } = await this.pool.query(query, [commentId, userId]);
    return (rowCount || 0) > 0;
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
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      mentions: row.mentions || [],
      isEdited: row.is_edited,
      isDeleted: row.is_deleted,
      metadata: row.metadata || {},
    };
  }
}
