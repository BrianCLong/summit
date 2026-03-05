// @ts-nocheck
import { randomUUID } from 'node:crypto';
import { Pool, type PoolClient } from 'pg';

export interface EntityCommentAttachmentInput {
  fileName: string;
  contentType?: string;
  sizeBytes?: number;
  storageUri?: string;
  metadata?: Record<string, unknown>;
}

export interface EntityCommentInput {
  tenantId: string;
  entityId: string;
  entityType?: string;
  entityLabel?: string;
  authorId: string;
  content: string;
  metadata?: Record<string, unknown>;
  attachments?: EntityCommentAttachmentInput[];
}

export interface EntityCommentAttachment {
  id: string;
  fileName: string;
  contentType?: string | null;
  sizeBytes?: number | null;
  storageUri?: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface EntityCommentMention {
  userId: string;
  username: string;
}

export interface EntityComment {
  id: string;
  tenantId: string;
  entityId: string;
  entityRefId?: string | null;
  entityType?: string | null;
  entityLabel?: string | null;
  authorId: string;
  content: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
  deletedBy?: string | null;
  deleteReason?: string | null;
  attachments: EntityCommentAttachment[];
  mentions: EntityCommentMention[];
}

const MENTION_REGEX = /@([a-zA-Z0-9._-]{2,50})/g;
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const isSafeDeleteEnabled = () => process.env.SAFE_DELETE !== 'false';

export interface ListCommentsOptions {
  includeDeleted?: boolean;
}

export class EntityCommentService {
  constructor(private pool: Pool) {}

  async addComment(input: EntityCommentInput): Promise<EntityComment> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      const commentResult = await client.query(
        `
          INSERT INTO maestro.entity_comments (
            tenant_id,
            entity_id,
            entity_ref_id,
            entity_type,
            entity_label,
            author_id,
            content_markdown,
            metadata
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          RETURNING *
        `,
        [
          input.tenantId,
          input.entityId,
          UUID_REGEX.test(input.entityId) ? input.entityId : null,
          input.entityType || null,
          input.entityLabel || null,
          input.authorId,
          input.content,
          input.metadata || {},
        ],
      );

      const commentRow = commentResult.rows[0];

      const attachments = await this.insertAttachments(
        client,
        commentRow.id,
        input.attachments || [],
      );

      const mentions = await this.resolveMentions(client, input.content);
      await this.insertMentions(client, commentRow.id, mentions);

      await client.query('COMMIT');

      return this.mapCommentRow(commentRow, attachments, mentions);
    } catch (error: any) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async listComments(
    tenantId: string,
    entityId: string,
    limit = 50,
    offset = 0,
    options: ListCommentsOptions = {},
  ): Promise<EntityComment[]> {
    const conditions = ['tenant_id = $1', 'entity_id = $2'];
    if (isSafeDeleteEnabled() && !options.includeDeleted) {
      conditions.push('deleted_at IS NULL');
    }

    const result = await this.pool.query(
      `
        SELECT *
        FROM maestro.entity_comments
        WHERE ${conditions.join(' AND ')}
        ORDER BY created_at ASC
        LIMIT $3 OFFSET $4
      `,
      [tenantId, entityId, limit, offset],
    );

    const commentRows = result.rows;
    if (commentRows.length === 0) {
      return [];
    }

    const commentIds = commentRows.map((row: any) => row.id);

    const [attachments, mentions] = await Promise.all([
      this.fetchAttachments(commentIds),
      this.fetchMentions(commentIds),
    ]);

    return commentRows.map((row: any) =>
      this.mapCommentRow(
        row,
        attachments.get(row.id) || [],
        mentions.get(row.id) || [],
      ),
    );
  }

  async getCommentById(
    tenantId: string,
    commentId: string,
  ): Promise<EntityComment | null> {
    const result = await this.pool.query(
      `
        SELECT *
        FROM maestro.entity_comments
        WHERE tenant_id = $1 AND id = $2
        LIMIT 1
      `,
      [tenantId, commentId],
    );

    const row = result.rows?.[0];
    if (!row) {
      return null;
    }

    const [attachments, mentions] = await Promise.all([
      this.fetchAttachments([row.id]).then((map) => map.get(row.id) || []),
      this.fetchMentions([row.id]).then((map) => map.get(row.id) || []),
    ]);

    return this.mapCommentRow(row, attachments, mentions);
  }

  async softDeleteComment(
    tenantId: string,
    commentId: string,
    actorId: string,
    reason?: string,
  ): Promise<EntityComment | null> {
    const retentionDays = Number(
      process.env.ENTITY_COMMENT_RETENTION_DAYS || process.env.SUPPORT_COMMENT_RETENTION_DAYS || '30',
    );
    const purgeAfter = Number.isFinite(retentionDays)
      ? new Date(Date.now() + retentionDays * 24 * 60 * 60 * 1000)
      : null;

    const result = await this.pool.query(
      `
        UPDATE maestro.entity_comments
        SET deleted_at = NOW(), deleted_by = $3, delete_reason = $4, updated_at = NOW()
        WHERE tenant_id = $1 AND id = $2
        RETURNING *
      `,
      [tenantId, commentId, actorId, reason || null],
    );

    const row = result.rows?.[0];
    if (!row) {
      return null;
    }

    const [attachments, mentions] = await Promise.all([
      this.fetchAttachments([row.id]).then((map) => map.get(row.id) || []),
      this.fetchMentions([row.id]).then((map) => map.get(row.id) || []),
    ]);

    const comment = this.mapCommentRow(row, attachments, mentions);
    await this.recordAudit(commentId, tenantId, 'delete', actorId, reason, {
      purgeAfter: purgeAfter?.toISOString?.(),
    });
    return {
      ...comment,
      metadata: {
        ...comment.metadata,
        purgeAfter: purgeAfter?.toISOString?.(),
      },
    };
  }

  async restoreComment(
    tenantId: string,
    commentId: string,
    actorId: string,
  ): Promise<EntityComment | null> {
    const result = await this.pool.query(
      `
        UPDATE maestro.entity_comments
        SET deleted_at = NULL, deleted_by = NULL, delete_reason = NULL, updated_at = NOW()
        WHERE tenant_id = $1 AND id = $2
        RETURNING *
      `,
      [tenantId, commentId],
    );

    const row = result.rows?.[0];
    if (!row) {
      return null;
    }

    const [attachments, mentions] = await Promise.all([
      this.fetchAttachments([row.id]).then((map) => map.get(row.id) || []),
      this.fetchMentions([row.id]).then((map) => map.get(row.id) || []),
    ]);

    const comment = this.mapCommentRow(row, attachments, mentions);
    await this.recordAudit(commentId, tenantId, 'restore', actorId);
    return comment;
  }

  private async insertAttachments(
    client: PoolClient,
    commentId: string,
    attachments: EntityCommentAttachmentInput[],
  ): Promise<EntityCommentAttachment[]> {
    if (attachments.length === 0) return [];

    const results: EntityCommentAttachment[] = [];
    // BOLT OPTIMIZATION: Use multi-row INSERT for attachments to reduce round-trips from N to N/batchSize.
    // Chunking ensures we stay within PostgreSQL parameter limits (65,535).
    const BATCH_SIZE = 100;

    for (let i = 0; i < attachments.length; i += BATCH_SIZE) {
      const chunk = attachments.slice(i, i + BATCH_SIZE);
      const values: any[] = [];
      const placeholders = chunk
        .map((attachment, index) => {
          const offset = index * 6;
          values.push(
            commentId,
            attachment.fileName,
            attachment.contentType || null,
            attachment.sizeBytes || null,
            attachment.storageUri || null,
            attachment.metadata || {},
          );
          return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6})`;
        })
        .join(', ');

      const res = await client.query(
        `
          INSERT INTO maestro.entity_comment_attachments (
            comment_id,
            file_name,
            content_type,
            size_bytes,
            storage_uri,
            metadata
          )
          VALUES ${placeholders}
          RETURNING *
        `,
        values,
      );
      results.push(...res.rows.map((row) => this.mapAttachmentRow(row)));
    }

    return results;
  }

  private async fetchAttachments(
    commentIds: string[],
  ): Promise<Map<string, EntityCommentAttachment[]>> {
    if (commentIds.length === 0) {
      return new Map();
    }

    const result = await this.pool.query(
      `
        SELECT *
        FROM maestro.entity_comment_attachments
        WHERE comment_id = ANY($1)
        ORDER BY created_at ASC
      `,
      [commentIds],
    );

    const map = new Map<string, EntityCommentAttachment[]>();
    for (const row of result.rows) {
      const list = map.get(row.comment_id) || [];
      list.push(this.mapAttachmentRow(row));
      map.set(row.comment_id, list);
    }
    return map;
  }

  private async resolveMentions(
    client: PoolClient,
    content: string,
  ): Promise<EntityCommentMention[]> {
    const usernames = new Set<string>();
    for (const match of content.matchAll(MENTION_REGEX)) {
      usernames.add(match[1]);
    }

    if (usernames.size === 0) {
      return [];
    }

    const result = await client.query(
      `
        SELECT id, username
        FROM users
        WHERE username = ANY($1)
      `,
      [[...usernames]],
    );

    return result.rows.map((row: any) => ({
      userId: String(row.id),
      username: row.username,
    }));
  }

  private async insertMentions(
    client: PoolClient,
    commentId: string,
    mentions: EntityCommentMention[],
  ): Promise<void> {
    if (mentions.length === 0) return;

    // BOLT OPTIMIZATION: Use multi-row INSERT for mentions to reduce round-trips from N to N/batchSize.
    const BATCH_SIZE = 100;

    for (let i = 0; i < mentions.length; i += BATCH_SIZE) {
      const chunk = mentions.slice(i, i + BATCH_SIZE);
      const values: any[] = [];
      const placeholders = chunk
        .map((mention, index) => {
          const offset = index * 3;
          values.push(commentId, mention.userId, mention.username);
          return `($${offset + 1}, $${offset + 2}, $${offset + 3})`;
        })
        .join(', ');

      await client.query(
        `
          INSERT INTO maestro.entity_comment_mentions (
            comment_id,
            mentioned_user_id,
            mentioned_username
          )
          VALUES ${placeholders}
          ON CONFLICT (comment_id, mentioned_user_id) DO NOTHING
        `,
        values,
      );
    }
  }

  private async fetchMentions(
    commentIds: string[],
  ): Promise<Map<string, EntityCommentMention[]>> {
    if (commentIds.length === 0) {
      return new Map();
    }

    const result = await this.pool.query(
      `
        SELECT comment_id, mentioned_user_id, mentioned_username
        FROM maestro.entity_comment_mentions
        WHERE comment_id = ANY($1)
        ORDER BY created_at ASC
      `,
      [commentIds],
    );

    const map = new Map<string, EntityCommentMention[]>();
    for (const row of result.rows) {
      const list = map.get(row.comment_id) || [];
      list.push({
        userId: row.mentioned_user_id,
        username: row.mentioned_username,
      });
      map.set(row.comment_id, list);
    }
    return map;
  }

  private mapCommentRow(
    row: any,
    attachments: EntityCommentAttachment[],
    mentions: EntityCommentMention[],
  ): EntityComment {
    return {
      id: row.id,
      tenantId: row.tenant_id,
      entityId: row.entity_id,
      entityRefId: row.entity_ref_id,
      entityType: row.entity_type,
      entityLabel: row.entity_label,
      authorId: row.author_id,
      content: row.content_markdown,
      metadata: row.metadata || {},
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      deletedAt: row.deleted_at,
      deletedBy: row.deleted_by,
      deleteReason: row.delete_reason,
      attachments,
      mentions,
    };
  }

  private mapAttachmentRow(row): EntityCommentAttachment {
    return {
      id: row.id,
      fileName: row.file_name,
      contentType: row.content_type,
      sizeBytes: row.size_bytes,
      storageUri: row.storage_uri,
      metadata: row.metadata || {},
      createdAt: row.created_at,
    };
  }

  private async recordAudit(
    commentId: string,
    tenantId: string,
    action: string,
    actorId: string,
    reason?: string,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    await this.pool.query(
      `
        INSERT INTO maestro.entity_comment_audits (
          id,
          comment_id,
          tenant_id,
          action,
          actor_id,
          reason,
          metadata
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `,
      [
        randomUUID(),
        commentId,
        tenantId,
        action,
        actorId,
        reason || null,
        JSON.stringify(metadata || {}),
      ],
    );
  }
}
