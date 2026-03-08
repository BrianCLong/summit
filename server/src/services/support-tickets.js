"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTicket = createTicket;
exports.getTicketById = getTicketById;
exports.listTickets = listTickets;
exports.updateTicket = updateTicket;
exports.deleteTicket = deleteTicket;
exports.addComment = addComment;
exports.getComments = getComments;
exports.getCommentById = getCommentById;
exports.softDeleteComment = softDeleteComment;
exports.restoreComment = restoreComment;
exports.getTicketCount = getTicketCount;
const postgres_js_1 = require("../db/postgres.js");
const safeRows = (result) => Array.isArray(result?.rows)
    ? result.rows
    : [];
const isSafeDeleteEnabled = () => process.env.SAFE_DELETE !== 'false';
let commentSchemaEnsured = false;
async function ensureCommentSoftDeleteSchema() {
    if (commentSchemaEnsured)
        return;
    const pool = (0, postgres_js_1.getPostgresPool)();
    await pool.query(`
    ALTER TABLE support_ticket_comments
      ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
      ADD COLUMN IF NOT EXISTS deleted_by text,
      ADD COLUMN IF NOT EXISTS delete_reason text;

    CREATE TABLE IF NOT EXISTS support_ticket_comment_audits (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      comment_id uuid NOT NULL REFERENCES support_ticket_comments(id) ON DELETE CASCADE,
      action text NOT NULL,
      actor_id text,
      reason text,
      metadata jsonb DEFAULT '{}',
      created_at timestamptz DEFAULT now()
    );

    CREATE INDEX IF NOT EXISTS idx_support_ticket_comments_deleted ON support_ticket_comments(deleted_at);
    CREATE INDEX IF NOT EXISTS idx_support_ticket_comment_audits_comment ON support_ticket_comment_audits(comment_id);
  `);
    commentSchemaEnsured = true;
}
async function recordCommentAudit(commentId, action, actorId, reason, metadata) {
    const pool = (0, postgres_js_1.getPostgresPool)();
    await pool.query(`INSERT INTO support_ticket_comment_audits (comment_id, action, actor_id, reason, metadata)
     VALUES ($1, $2, $3, $4, $5)`, [commentId, action, actorId, reason || null, JSON.stringify(metadata || {})]);
}
async function createTicket(input) {
    const pool = (0, postgres_js_1.getPostgresPool)();
    const result = await pool.query(`INSERT INTO support_tickets (title, description, priority, category, reporter_id, reporter_email, tags, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`, [
        input.title,
        input.description,
        input.priority || 'medium',
        input.category || 'other',
        input.reporter_id,
        input.reporter_email || null,
        input.tags || [],
        JSON.stringify(input.metadata || {}),
    ]);
    return safeRows(result)[0];
}
async function getTicketById(id) {
    const pool = (0, postgres_js_1.getPostgresPool)();
    const result = await pool.query('SELECT * FROM support_tickets WHERE id = $1', [id]);
    const rows = safeRows(result);
    return rows[0] || null;
}
async function listTickets(options = {}) {
    const pool = (0, postgres_js_1.getPostgresPool)();
    const conditions = [];
    const params = [];
    let paramIdx = 1;
    if (options.status) {
        conditions.push(`status = $${paramIdx++}`);
        params.push(options.status);
    }
    if (options.priority) {
        conditions.push(`priority = $${paramIdx++}`);
        params.push(options.priority);
    }
    if (options.category) {
        conditions.push(`category = $${paramIdx++}`);
        params.push(options.category);
    }
    if (options.reporter_id) {
        conditions.push(`reporter_id = $${paramIdx++}`);
        params.push(options.reporter_id);
    }
    if (options.assignee_id) {
        conditions.push(`assignee_id = $${paramIdx++}`);
        params.push(options.assignee_id);
    }
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const limit = options.limit || 50;
    const offset = options.offset || 0;
    const result = await pool.query(`SELECT * FROM support_tickets ${whereClause} ORDER BY created_at DESC LIMIT $${paramIdx++} OFFSET $${paramIdx}`, [...params, limit, offset]);
    return safeRows(result);
}
async function updateTicket(id, input) {
    const pool = (0, postgres_js_1.getPostgresPool)();
    const updates = ['updated_at = NOW()'];
    const params = [];
    let paramIdx = 1;
    if (input.title !== undefined) {
        updates.push(`title = $${paramIdx++}`);
        params.push(input.title);
    }
    if (input.description !== undefined) {
        updates.push(`description = $${paramIdx++}`);
        params.push(input.description);
    }
    if (input.status !== undefined) {
        updates.push(`status = $${paramIdx++}`);
        params.push(input.status);
        if (input.status === 'resolved') {
            updates.push('resolved_at = NOW()');
        }
        if (input.status === 'closed') {
            updates.push('closed_at = NOW()');
        }
    }
    if (input.priority !== undefined) {
        updates.push(`priority = $${paramIdx++}`);
        params.push(input.priority);
    }
    if (input.category !== undefined) {
        updates.push(`category = $${paramIdx++}`);
        params.push(input.category);
    }
    if (input.assignee_id !== undefined) {
        updates.push(`assignee_id = $${paramIdx++}`);
        params.push(input.assignee_id);
    }
    if (input.tags !== undefined) {
        updates.push(`tags = $${paramIdx++}`);
        params.push(input.tags);
    }
    if (input.metadata !== undefined) {
        updates.push(`metadata = $${paramIdx++}`);
        params.push(JSON.stringify(input.metadata));
    }
    params.push(id);
    const result = await pool.query(`UPDATE support_tickets SET ${updates.join(', ')} WHERE id = $${paramIdx} RETURNING *`, params);
    const rows = safeRows(result);
    return rows[0] || null;
}
async function deleteTicket(id) {
    const pool = (0, postgres_js_1.getPostgresPool)();
    const result = await pool.query('DELETE FROM support_tickets WHERE id = $1', [id]);
    return result.rowCount === 1;
}
async function addComment(ticketId, authorId, content, options) {
    await ensureCommentSoftDeleteSchema();
    const pool = (0, postgres_js_1.getPostgresPool)();
    const result = await pool.query(`INSERT INTO support_ticket_comments (ticket_id, author_id, author_email, content, is_internal)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`, [ticketId, authorId, options?.authorEmail || null, content, options?.isInternal || false]);
    return safeRows(result)[0];
}
async function getComments(ticketId, options = {}) {
    await ensureCommentSoftDeleteSchema();
    const pool = (0, postgres_js_1.getPostgresPool)();
    const conditions = ['ticket_id = $1'];
    if (isSafeDeleteEnabled() && !options.includeDeleted) {
        conditions.push('deleted_at IS NULL');
    }
    const result = await pool.query(`SELECT * FROM support_ticket_comments WHERE ${conditions.join(' AND ')} ORDER BY created_at ASC`, [ticketId]);
    return safeRows(result);
}
async function getCommentById(commentId) {
    await ensureCommentSoftDeleteSchema();
    const pool = (0, postgres_js_1.getPostgresPool)();
    const result = await pool.query('SELECT * FROM support_ticket_comments WHERE id = $1', [commentId]);
    const rows = safeRows(result);
    return rows[0] || null;
}
async function softDeleteComment(commentId, actorId, reason) {
    await ensureCommentSoftDeleteSchema();
    const pool = (0, postgres_js_1.getPostgresPool)();
    const retentionDays = Number(process.env.SUPPORT_COMMENT_RETENTION_DAYS || '30');
    const purgeAfter = Number.isFinite(retentionDays)
        ? new Date(Date.now() + retentionDays * 24 * 60 * 60 * 1000)
        : null;
    const result = await pool.query(`UPDATE support_ticket_comments
     SET deleted_at = NOW(), deleted_by = $2, delete_reason = $3
     WHERE id = $1
     RETURNING *`, [commentId, actorId, reason || null]);
    const rows = safeRows(result);
    const comment = rows[0] || null;
    if (comment) {
        await recordCommentAudit(commentId, 'delete', actorId, reason, {
            purgeAfter: purgeAfter?.toISOString?.(),
        });
    }
    return comment;
}
async function restoreComment(commentId, actorId) {
    await ensureCommentSoftDeleteSchema();
    const pool = (0, postgres_js_1.getPostgresPool)();
    const result = await pool.query(`UPDATE support_ticket_comments
     SET deleted_at = NULL, deleted_by = NULL, delete_reason = NULL, updated_at = NOW()
     WHERE id = $1
     RETURNING *`, [commentId]);
    const rows = safeRows(result);
    const comment = rows[0] || null;
    if (comment) {
        await recordCommentAudit(commentId, 'restore', actorId);
    }
    return comment;
}
async function getTicketCount(options = {}) {
    const pool = (0, postgres_js_1.getPostgresPool)();
    const conditions = [];
    const params = [];
    let paramIdx = 1;
    if (options.status) {
        conditions.push(`status = $${paramIdx++}`);
        params.push(options.status);
    }
    if (options.priority) {
        conditions.push(`priority = $${paramIdx++}`);
        params.push(options.priority);
    }
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const result = await pool.query(`SELECT COUNT(*) as count FROM support_tickets ${whereClause}`, params);
    const rows = safeRows(result);
    return parseInt(rows[0]?.count || '0', 10);
}
