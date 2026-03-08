"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EntityCommentService = void 0;
// @ts-nocheck
const node_crypto_1 = require("node:crypto");
const MENTION_REGEX = /@([a-zA-Z0-9._-]{2,50})/g;
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const isSafeDeleteEnabled = () => process.env.SAFE_DELETE !== 'false';
class EntityCommentService {
    pool;
    constructor(pool) {
        this.pool = pool;
    }
    async addComment(input) {
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');
            const commentResult = await client.query(`
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
        `, [
                input.tenantId,
                input.entityId,
                UUID_REGEX.test(input.entityId) ? input.entityId : null,
                input.entityType || null,
                input.entityLabel || null,
                input.authorId,
                input.content,
                input.metadata || {},
            ]);
            const commentRow = commentResult.rows[0];
            const attachments = await this.insertAttachments(client, commentRow.id, input.attachments || []);
            const mentions = await this.resolveMentions(client, input.content);
            await this.insertMentions(client, commentRow.id, mentions);
            await client.query('COMMIT');
            return this.mapCommentRow(commentRow, attachments, mentions);
        }
        catch (error) {
            await client.query('ROLLBACK');
            throw error;
        }
        finally {
            client.release();
        }
    }
    async listComments(tenantId, entityId, limit = 50, offset = 0, options = {}) {
        const conditions = ['tenant_id = $1', 'entity_id = $2'];
        if (isSafeDeleteEnabled() && !options.includeDeleted) {
            conditions.push('deleted_at IS NULL');
        }
        const result = await this.pool.query(`
        SELECT *
        FROM maestro.entity_comments
        WHERE ${conditions.join(' AND ')}
        ORDER BY created_at ASC
        LIMIT $3 OFFSET $4
      `, [tenantId, entityId, limit, offset]);
        const commentRows = result.rows;
        if (commentRows.length === 0) {
            return [];
        }
        const commentIds = commentRows.map((row) => row.id);
        const [attachments, mentions] = await Promise.all([
            this.fetchAttachments(commentIds),
            this.fetchMentions(commentIds),
        ]);
        return commentRows.map((row) => this.mapCommentRow(row, attachments.get(row.id) || [], mentions.get(row.id) || []));
    }
    async getCommentById(tenantId, commentId) {
        const result = await this.pool.query(`
        SELECT *
        FROM maestro.entity_comments
        WHERE tenant_id = $1 AND id = $2
        LIMIT 1
      `, [tenantId, commentId]);
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
    async softDeleteComment(tenantId, commentId, actorId, reason) {
        const retentionDays = Number(process.env.ENTITY_COMMENT_RETENTION_DAYS || process.env.SUPPORT_COMMENT_RETENTION_DAYS || '30');
        const purgeAfter = Number.isFinite(retentionDays)
            ? new Date(Date.now() + retentionDays * 24 * 60 * 60 * 1000)
            : null;
        const result = await this.pool.query(`
        UPDATE maestro.entity_comments
        SET deleted_at = NOW(), deleted_by = $3, delete_reason = $4, updated_at = NOW()
        WHERE tenant_id = $1 AND id = $2
        RETURNING *
      `, [tenantId, commentId, actorId, reason || null]);
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
    async restoreComment(tenantId, commentId, actorId) {
        const result = await this.pool.query(`
        UPDATE maestro.entity_comments
        SET deleted_at = NULL, deleted_by = NULL, delete_reason = NULL, updated_at = NOW()
        WHERE tenant_id = $1 AND id = $2
        RETURNING *
      `, [tenantId, commentId]);
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
    async insertAttachments(client, commentId, attachments) {
        if (attachments.length === 0)
            return [];
        const results = [];
        // BOLT OPTIMIZATION: Use multi-row INSERT for attachments to reduce round-trips from N to N/batchSize.
        // Chunking ensures we stay within PostgreSQL parameter limits (65,535).
        const BATCH_SIZE = 100;
        for (let i = 0; i < attachments.length; i += BATCH_SIZE) {
            const chunk = attachments.slice(i, i + BATCH_SIZE);
            const values = [];
            const placeholders = chunk
                .map((attachment, index) => {
                const offset = index * 6;
                values.push(commentId, attachment.fileName, attachment.contentType || null, attachment.sizeBytes || null, attachment.storageUri || null, attachment.metadata || {});
                return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6})`;
            })
                .join(', ');
            const res = await client.query(`
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
        `, values);
            results.push(...res.rows.map((row) => this.mapAttachmentRow(row)));
        }
        return results;
    }
    async fetchAttachments(commentIds) {
        if (commentIds.length === 0) {
            return new Map();
        }
        const result = await this.pool.query(`
        SELECT *
        FROM maestro.entity_comment_attachments
        WHERE comment_id = ANY($1)
        ORDER BY created_at ASC
      `, [commentIds]);
        const map = new Map();
        for (const row of result.rows) {
            const list = map.get(row.comment_id) || [];
            list.push(this.mapAttachmentRow(row));
            map.set(row.comment_id, list);
        }
        return map;
    }
    async resolveMentions(client, content) {
        const usernames = new Set();
        for (const match of content.matchAll(MENTION_REGEX)) {
            usernames.add(match[1]);
        }
        if (usernames.size === 0) {
            return [];
        }
        const result = await client.query(`
        SELECT id, username
        FROM users
        WHERE username = ANY($1)
      `, [[...usernames]]);
        return result.rows.map((row) => ({
            userId: String(row.id),
            username: row.username,
        }));
    }
    async insertMentions(client, commentId, mentions) {
        if (mentions.length === 0)
            return;
        // BOLT OPTIMIZATION: Use multi-row INSERT for mentions to reduce round-trips from N to N/batchSize.
        const BATCH_SIZE = 100;
        for (let i = 0; i < mentions.length; i += BATCH_SIZE) {
            const chunk = mentions.slice(i, i + BATCH_SIZE);
            const values = [];
            const placeholders = chunk
                .map((mention, index) => {
                const offset = index * 3;
                values.push(commentId, mention.userId, mention.username);
                return `($${offset + 1}, $${offset + 2}, $${offset + 3})`;
            })
                .join(', ');
            await client.query(`
          INSERT INTO maestro.entity_comment_mentions (
            comment_id,
            mentioned_user_id,
            mentioned_username
          )
          VALUES ${placeholders}
          ON CONFLICT (comment_id, mentioned_user_id) DO NOTHING
        `, values);
        }
    }
    async fetchMentions(commentIds) {
        if (commentIds.length === 0) {
            return new Map();
        }
        const result = await this.pool.query(`
        SELECT comment_id, mentioned_user_id, mentioned_username
        FROM maestro.entity_comment_mentions
        WHERE comment_id = ANY($1)
        ORDER BY created_at ASC
      `, [commentIds]);
        const map = new Map();
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
    mapCommentRow(row, attachments, mentions) {
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
    mapAttachmentRow(row) {
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
    async recordAudit(commentId, tenantId, action, actorId, reason, metadata) {
        await this.pool.query(`
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
      `, [
            (0, node_crypto_1.randomUUID)(),
            commentId,
            tenantId,
            action,
            actorId,
            reason || null,
            JSON.stringify(metadata || {}),
        ]);
    }
}
exports.EntityCommentService = EntityCommentService;
