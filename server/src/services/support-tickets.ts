import { getPostgresPool } from '../db/postgres.js';

export type TicketStatus = 'open' | 'in_progress' | 'waiting' | 'resolved' | 'closed';
export type TicketPriority = 'low' | 'medium' | 'high' | 'critical';
export type TicketCategory = 'bug' | 'feature_request' | 'question' | 'incident' | 'other';

export interface SupportTicket {
  id: string;
  title: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  category: TicketCategory;
  reporter_id: string;
  reporter_email?: string;
  assignee_id?: string;
  tags: string[];
  metadata: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
  resolved_at?: Date;
  closed_at?: Date;
}

export interface TicketComment {
  id: string;
  ticket_id: string;
  author_id: string;
  author_email?: string;
  content: string;
  is_internal: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface CreateTicketInput {
  title: string;
  description: string;
  priority?: TicketPriority;
  category?: TicketCategory;
  reporter_id: string;
  reporter_email?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface UpdateTicketInput {
  title?: string;
  description?: string;
  status?: TicketStatus;
  priority?: TicketPriority;
  category?: TicketCategory;
  assignee_id?: string | null;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface ListTicketsOptions {
  status?: TicketStatus;
  priority?: TicketPriority;
  category?: TicketCategory;
  reporter_id?: string;
  assignee_id?: string;
  limit?: number;
  offset?: number;
}

const safeRows = <T = unknown>(result: unknown): T[] =>
  Array.isArray((result as { rows?: unknown[] })?.rows)
    ? ((result as { rows: T[] }).rows as T[])
    : [];

export async function createTicket(input: CreateTicketInput): Promise<SupportTicket> {
  const pool = getPostgresPool();
  const result = await pool.query(
    `INSERT INTO support_tickets (title, description, priority, category, reporter_id, reporter_email, tags, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [
      input.title,
      input.description,
      input.priority || 'medium',
      input.category || 'other',
      input.reporter_id,
      input.reporter_email || null,
      input.tags || [],
      JSON.stringify(input.metadata || {}),
    ],
  );
  return safeRows<SupportTicket>(result)[0];
}

export async function getTicketById(id: string): Promise<SupportTicket | null> {
  const pool = getPostgresPool();
  const result = await pool.query('SELECT * FROM support_tickets WHERE id = $1', [id]);
  const rows = safeRows<SupportTicket>(result);
  return rows[0] || null;
}

export async function listTickets(options: ListTicketsOptions = {}): Promise<SupportTicket[]> {
  const pool = getPostgresPool();
  const conditions: string[] = [];
  const params: unknown[] = [];
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

  const result = await pool.query(
    `SELECT * FROM support_tickets ${whereClause} ORDER BY created_at DESC LIMIT $${paramIdx++} OFFSET $${paramIdx}`,
    [...params, limit, offset],
  );
  return safeRows<SupportTicket>(result);
}

export async function updateTicket(
  id: string,
  input: UpdateTicketInput,
): Promise<SupportTicket | null> {
  const pool = getPostgresPool();
  const updates: string[] = ['updated_at = NOW()'];
  const params: unknown[] = [];
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
  const result = await pool.query(
    `UPDATE support_tickets SET ${updates.join(', ')} WHERE id = $${paramIdx} RETURNING *`,
    params,
  );
  const rows = safeRows<SupportTicket>(result);
  return rows[0] || null;
}

export async function deleteTicket(id: string): Promise<boolean> {
  const pool = getPostgresPool();
  const result = await pool.query('DELETE FROM support_tickets WHERE id = $1', [id]);
  return (result as { rowCount?: number }).rowCount === 1;
}

export async function addComment(
  ticketId: string,
  authorId: string,
  content: string,
  options?: { authorEmail?: string; isInternal?: boolean },
): Promise<TicketComment> {
  const pool = getPostgresPool();
  const result = await pool.query(
    `INSERT INTO support_ticket_comments (ticket_id, author_id, author_email, content, is_internal)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [ticketId, authorId, options?.authorEmail || null, content, options?.isInternal || false],
  );
  return safeRows<TicketComment>(result)[0];
}

export async function getComments(ticketId: string): Promise<TicketComment[]> {
  const pool = getPostgresPool();
  const result = await pool.query(
    'SELECT * FROM support_ticket_comments WHERE ticket_id = $1 ORDER BY created_at ASC',
    [ticketId],
  );
  return safeRows<TicketComment>(result);
}

export async function getTicketCount(options: Omit<ListTicketsOptions, 'limit' | 'offset'> = {}): Promise<number> {
  const pool = getPostgresPool();
  const conditions: string[] = [];
  const params: unknown[] = [];
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
  const rows = safeRows<{ count: string }>(result);
  return parseInt(rows[0]?.count || '0', 10);
}
