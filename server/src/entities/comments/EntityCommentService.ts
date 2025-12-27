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
  entityType?: string | null;
  entityLabel?: string | null;
  authorId: string;
  content: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  attachments: EntityCommentAttachment[];
  mentions: EntityCommentMention[];
}

const MENTION_REGEX = /@([a-zA-Z0-9._-]{2,50})/g;

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
            entity_type,
            entity_label,
            author_id,
            content_markdown,
            metadata
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING *
        `,
        [
          input.tenantId,
          input.entityId,
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
    } catch (error) {
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
  ): Promise<EntityComment[]> {
    const result = await this.pool.query(
      `
        SELECT *
        FROM maestro.entity_comments
        WHERE tenant_id = $1 AND entity_id = $2
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

  private async insertAttachments(
    client: PoolClient,
    commentId: string,
    attachments: EntityCommentAttachmentInput[],
  ): Promise<EntityCommentAttachment[]> {
    const results: EntityCommentAttachment[] = [];

    for (const attachment of attachments) {
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
          VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING *
        `,
        [
          commentId,
          attachment.fileName,
          attachment.contentType || null,
          attachment.sizeBytes || null,
          attachment.storageUri || null,
          attachment.metadata || {},
        ],
      );
      results.push(this.mapAttachmentRow(res.rows[0]));
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
    for (const mention of mentions) {
      await client.query(
        `
          INSERT INTO maestro.entity_comment_mentions (
            comment_id,
            mentioned_user_id,
            mentioned_username
          )
          VALUES ($1, $2, $3)
          ON CONFLICT (comment_id, mentioned_user_id) DO NOTHING
        `,
        [commentId, mention.userId, mention.username],
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
      entityType: row.entity_type,
      entityLabel: row.entity_label,
      authorId: row.author_id,
      content: row.content_markdown,
      metadata: row.metadata || {},
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      attachments,
      mentions,
    };
  }

  private mapAttachmentRow(row: any): EntityCommentAttachment {
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
}
