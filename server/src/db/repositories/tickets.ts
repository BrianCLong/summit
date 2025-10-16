import { getPostgresPool } from '../postgres';
import baseLogger from '../../config/logger';

const logger = baseLogger.child({ name: 'tickets-repo' });

export type Ticket = {
  provider: 'github' | 'jira';
  external_id: string;
  title: string;
  status: string;
  assignee?: string | null;
  labels?: string[] | null;
  priority?: string | null;
  sprint?: string | null;
  project?: string | null;
  repo?: string | null;
  url?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

async function ensureTable() {
  const pool = getPostgresPool();
  const sql = `
    CREATE TABLE IF NOT EXISTS maestro_tickets (
      id SERIAL PRIMARY KEY,
      provider TEXT NOT NULL,
      external_id TEXT NOT NULL,
      title TEXT NOT NULL,
      status TEXT NOT NULL,
      assignee TEXT,
      labels JSONB,
      priority TEXT,
      sprint TEXT,
      project TEXT,
      repo TEXT,
      url TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(provider, external_id)
    );
    CREATE TABLE IF NOT EXISTS ticket_runs (
      ticket_provider TEXT NOT NULL,
      ticket_external_id TEXT NOT NULL,
      run_id TEXT NOT NULL,
      PRIMARY KEY (ticket_provider, ticket_external_id, run_id)
    );
    CREATE TABLE IF NOT EXISTS ticket_deployments (
      ticket_provider TEXT NOT NULL,
      ticket_external_id TEXT NOT NULL,
      deployment_id TEXT NOT NULL,
      env TEXT,
      PRIMARY KEY (ticket_provider, ticket_external_id, deployment_id)
    );
  `;
  try {
    await pool.query(sql);
  } catch (e) {
    logger.warn(
      { err: e },
      'failed to ensure maestro_tickets table (mock mode?)',
    );
  }
}

export async function upsertTickets(items: Ticket[]) {
  await ensureTable();
  if (!items?.length) return { upserted: 0 };
  const pool = getPostgresPool();
  const sql = `
    INSERT INTO maestro_tickets (provider, external_id, title, status, assignee, labels, priority, sprint, project, repo, url, created_at, updated_at)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11, COALESCE($12, NOW()), NOW())
    ON CONFLICT (provider, external_id)
    DO UPDATE SET
      title = EXCLUDED.title,
      status = EXCLUDED.status,
      assignee = EXCLUDED.assignee,
      labels = EXCLUDED.labels,
      priority = EXCLUDED.priority,
      sprint = EXCLUDED.sprint,
      project = EXCLUDED.project,
      repo = EXCLUDED.repo,
      url = EXCLUDED.url,
      updated_at = NOW();
  `;
  let count = 0;
  for (const t of items) {
    try {
      await pool.query(sql, [
        t.provider,
        t.external_id,
        t.title,
        t.status,
        t.assignee ?? null,
        t.labels ? JSON.stringify(t.labels) : null,
        t.priority ?? null,
        t.sprint ?? null,
        t.project ?? null,
        t.repo ?? null,
        t.url ?? null,
        t.created_at ?? null,
      ]);
      count++;
    } catch (e) {
      logger.warn({ err: e, t }, 'ticket upsert failed');
    }
  }
  return { upserted: count };
}

export type TicketFilters = {
  provider?: 'github' | 'jira';
  assignee?: string;
  label?: string;
  project?: string;
  repo?: string;
};

export async function listTickets(
  limit = 50,
  offset = 0,
  filters: TicketFilters = {},
) {
  await ensureTable();
  const pool = getPostgresPool();
  try {
    const where: string[] = [];
    const params: any[] = [];
    let idx = 1;
    if (filters.provider) {
      where.push(`provider = $${idx++}`);
      params.push(filters.provider);
    }
    if (filters.assignee) {
      where.push(`assignee ILIKE $${idx++}`);
      params.push(`%${filters.assignee}%`);
    }
    if (filters.label) {
      where.push(`labels::text ILIKE $${idx++}`);
      params.push(`%${filters.label}%`);
    }
    if (filters.project) {
      where.push(`project ILIKE $${idx++}`);
      params.push(`%${filters.project}%`);
    }
    if (filters.repo) {
      where.push(`repo ILIKE $${idx++}`);
      params.push(`%${filters.repo}%`);
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const sql = `
      SELECT provider, external_id, title, status, assignee, labels, priority, sprint, project, repo, url, created_at, updated_at
      FROM maestro_tickets
      ${whereSql}
      ORDER BY updated_at DESC
      LIMIT $${idx++} OFFSET $${idx++}
    `;
    params.push(limit, offset);
    const res = await pool.query(sql, params);
    return res.rows.map((r) => ({
      provider: r.provider,
      external_id: r.external_id,
      title: r.title,
      status: r.status,
      assignee: r.assignee,
      labels: Array.isArray(r.labels)
        ? r.labels
        : r.labels
          ? Object.values(r.labels)
          : [],
      priority: r.priority,
      sprint: r.sprint,
      project: r.project,
      repo: r.repo,
      url: r.url,
      created_at: r.created_at,
      updated_at: r.updated_at,
    }));
  } catch (e) {
    logger.warn({ err: e }, 'listTickets fell back to empty');
    return [];
  }
}

export async function listTicketRuns(provider: string, externalId: string) {
  await ensureTable();
  const pool = getPostgresPool();
  try {
    const res = await pool.query(
      'SELECT run_id FROM ticket_runs WHERE ticket_provider=$1 AND ticket_external_id=$2',
      [provider, externalId],
    );
    return res.rows.map((r) => ({ id: r.run_id, status: null }));
  } catch (e) {
    return [];
  }
}

export async function listTicketDeployments(
  provider: string,
  externalId: string,
) {
  await ensureTable();
  const pool = getPostgresPool();
  try {
    const res = await pool.query(
      'SELECT deployment_id, env FROM ticket_deployments WHERE ticket_provider=$1 AND ticket_external_id=$2',
      [provider, externalId],
    );
    return res.rows.map((r) => ({
      id: r.deployment_id,
      env: r.env,
      status: null,
    }));
  } catch (e) {
    return [];
  }
}

// Mappers from webhooks
export function mapGitHubIssue(payload: any): Ticket | null {
  const issue = payload?.issue;
  if (!issue) return null;
  return {
    provider: 'github',
    external_id: String(issue.id),
    title: issue.title,
    status: issue.state,
    assignee: issue.assignee?.login ?? null,
    labels: (issue.labels || [])
      .map((l: any) => (typeof l === 'string' ? l : l.name))
      .filter(Boolean),
    priority: null,
    sprint: null,
    project: payload?.repository?.name ?? null,
    repo: payload?.repository?.full_name ?? null,
    url: issue.html_url,
    created_at: issue.created_at,
    updated_at: issue.updated_at,
  };
}

export function mapJiraIssue(payload: any): Ticket | null {
  const issue = payload?.issue;
  if (!issue) return null;
  const fields = issue.fields || {};
  return {
    provider: 'jira',
    external_id: String(issue.id),
    title: fields.summary || issue.key,
    status: fields.status?.name || 'Unknown',
    assignee: fields.assignee?.displayName || null,
    labels: fields.labels || [],
    priority: fields.priority?.name || null,
    sprint: (fields.sprint && fields.sprint.name) || null,
    project: fields.project?.key || null,
    repo: null,
    url: `${process.env.JIRA_BASE_URL || ''}/browse/${issue.key}`,
    created_at: fields.created,
    updated_at: fields.updated,
  };
}

export async function addTicketRunLink(
  provider: string,
  externalId: string,
  runId: string,
) {
  await ensureTable();
  const pool = getPostgresPool();
  try {
    await pool.query(
      `INSERT INTO ticket_runs (ticket_provider, ticket_external_id, run_id)
       VALUES ($1,$2,$3) ON CONFLICT DO NOTHING`,
      [provider, externalId, runId],
    );
    return { ok: true };
  } catch (e) {
    return { ok: false };
  }
}

export async function addTicketDeploymentLink(
  provider: string,
  externalId: string,
  deploymentId: string,
  env?: string,
) {
  await ensureTable();
  const pool = getPostgresPool();
  try {
    await pool.query(
      `INSERT INTO ticket_deployments (ticket_provider, ticket_external_id, deployment_id, env)
       VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING`,
      [provider, externalId, deploymentId, env || null],
    );
    return { ok: true };
  } catch (e) {
    return { ok: false };
  }
}
